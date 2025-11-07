import type {
  RecipeStatus,
  InstagramRecipePost,
} from "@/models/InstagramRecipePost";
import type { RecipeImportDocument } from "@/models/RecipeImport";
import {
  createRecipe,
  getImport,
  getRecipe,
  updateImport,
  type RecipeDocument,
  type UpdateImportInput,
} from "./firestore";
import { scrapeInstagramPost } from "./apify";
import {
  cleanupMedia,
  downloadMedia,
  type DownloadMediaResult,
  type MediaType,
} from "./media";
import { extractRecipe, uploadToGemini } from "./gemini";

const STAGE_PROGRESS: Record<RecipeStatus, number> = {
  queued: 0,
  scraping: 15,
  downloading_media: 35,
  uploading_media: 55,
  extracting: 80,
  ready: 100,
  failed: 100,
};

const MAX_STAGE_ATTEMPTS = 3;

type StageUpdateInput = Omit<
  UpdateImportInput,
  "status" | "stage" | "progress"
>;
type StageTransitionOptions = Omit<StageUpdateInput, "metadata"> & {
  metadataPatch?: Record<string, unknown>;
};
type StageSetter = (
  importId: string,
  updates?: StageUpdateInput
) => Promise<RecipeImportDocument>;

const setQueued = createStageSetter("queued");
const setScraping = createStageSetter("scraping");
const setDownloadingMedia = createStageSetter("downloading_media");
const setUploadingMedia = createStageSetter("uploading_media");
const setExtracting = createStageSetter("extracting");
const setReady = createStageSetter("ready");
const setFailed = createStageSetter("failed");

const STAGE_SETTERS: Record<RecipeStatus, StageSetter> = {
  queued: setQueued,
  scraping: setScraping,
  downloading_media: setDownloadingMedia,
  uploading_media: setUploadingMedia,
  extracting: setExtracting,
  ready: setReady,
  failed: setFailed,
};

export {
  setQueued,
  setScraping,
  setDownloadingMedia,
  setUploadingMedia,
  setExtracting,
  setReady,
  setFailed,
};

export async function processRecipeImport(
  importId: string
): Promise<RecipeDocument> {
  let currentImport = await getImport(importId);
  if (!currentImport) {
    throw new Error(`Import ${importId} not found`);
  }

  if (currentImport.status === "ready" && currentImport.recipeId) {
    const existing = await getRecipe(currentImport.recipeId);
    if (existing) {
      return existing;
    }
  }

  let currentStage: RecipeStatus = currentImport.status;
  let downloadedMediaPath: string | undefined;

  const transition = async (
    nextStage: RecipeStatus,
    options?: StageTransitionOptions
  ) => {
    if (!currentImport) {
      throw new Error(`Import ${importId} not found during transition`);
    }

    // Check if import has been cancelled
    await checkIfCancelled(importId);

    currentStage = nextStage;
    const payload = buildStageUpdatePayload(currentImport, options);
    currentImport = await STAGE_SETTERS[nextStage](importId, payload);
    return currentImport;
  };

  try {
    await transition("scraping", {
      error: null,
      metadataPatch: stageMetadata("scraping", {}),
    });

    if (!currentImport) {
      throw new Error(`Import ${importId} not found`);
    }

    const scraped = await runWithRetries(
      importId,
      "scrape Instagram content",
      () => scrapeInstagramPost({ url: currentImport!.inputUrl })
    );

    const mediaAsset = selectMediaAsset(scraped);

    await transition("downloading_media", {
      error: null,
      metadataPatch: stageMetadata("downloading_media", {
        mediaType: mediaAsset.mediaType,
        mediaSourceUrl: mediaAsset.url,
      }),
    });

    const download = await runWithRetries(importId, "download media", () =>
      downloadMedia(mediaAsset.url, {
        filename: buildMediaFilename(scraped, mediaAsset.mediaType),
      })
    );

    downloadedMediaPath = download.filePath;

    await transition("uploading_media", {
      error: null,
      metadataPatch: stageMetadata("uploading_media", {
        mediaSizeBytes: download.size,
      }),
    });

    const geminiFile = await runWithRetries(
      importId,
      "upload media to Gemini",
      () =>
        uploadToGemini(download.filePath, download.mimeType, {
          displayName: scraped.shortCode ?? scraped.id,
        })
    );

    const geminiFileUri = resolveGeminiFileUri(geminiFile);
    if (!geminiFileUri) {
      throw new Error("Gemini upload did not provide a file reference");
    }

    await transition("extracting", {
      error: null,
      metadataPatch: stageMetadata("extracting", {
        geminiFileUri,
      }),
    });

    const extraction = await runWithRetries(importId, "extract recipe", () =>
      extractRecipe({
        geminiFileUri,
        mediaMimeType: download.mimeType,
        caption: scraped.caption,
        hashtags: scraped.hashtags,
        ownerUsername: scraped.ownerUsername,
        latestComments: scraped.latestComments,
      })
    );

    const recipeDoc = await createRecipe({
      ...scraped,
      id: scraped.id,
      inputUrl: currentImport.inputUrl,
      importId,
      geminiFileUri,
      recipe_data: extraction.recipe,
    });

    await transition("ready", {
      recipeId: recipeDoc.id,
      error: null,
      metadataPatch: stageMetadata("ready", {
        confidence: extraction.confidence,
        issuesCount: extraction.issues.length,
      }),
    });

    console.info(`[import ${importId}] Recipe ${recipeDoc.id} ready`);
    return recipeDoc;
  } catch (error) {
    const message = toErrorMessage(error);
    console.error(
      `[import ${importId}] Failed at stage ${currentStage}: ${message}`
    );
    currentImport = await setFailed(
      importId,
      buildStageUpdatePayload(currentImport, {
        error: message,
        metadataPatch: stageMetadata("failed", {
          failureStage: currentStage,
          failureMessage: message,
        }),
      })
    );
    throw error;
  } finally {
    await cleanupMedia(downloadedMediaPath).catch((cleanupError) => {
      if (cleanupError) {
        console.warn(
          `[import ${importId}] Failed to cleanup media: ${toErrorMessage(
            cleanupError
          )}`
        );
      }
    });
  }
}

function createStageSetter(stage: RecipeStatus): StageSetter {
  return (importId, updates) =>
    updateImport(importId, {
      ...updates,
      status: stage,
      stage,
      progress: STAGE_PROGRESS[stage],
    });
}

function buildStageUpdatePayload(
  currentImport: RecipeImportDocument,
  options?: StageTransitionOptions
): StageUpdateInput {
  if (!options) {
    return {};
  }

  const { metadataPatch, ...rest } = options;
  if (metadataPatch) {
    return {
      ...rest,
      metadata: mergeMetadata(currentImport, metadataPatch),
    };
  }

  return rest;
}

function mergeMetadata(
  currentImport: RecipeImportDocument,
  patch: Record<string, unknown>
) {
  const base = { ...(currentImport.metadata ?? {}) };
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined) {
      delete base[key];
    } else {
      base[key] = value;
    }
  });
  return base;
}

function stageMetadata(stage: RecipeStatus, extra?: Record<string, unknown>) {
  return {
    lastStage: stage,
    lastStageUpdatedAt: new Date().toISOString(),
    ...extra,
  };
}

function selectMediaAsset(post: InstagramRecipePost): {
  url: string;
  mediaType: MediaType;
} {
  if (post.videoUrl) {
    return { url: post.videoUrl, mediaType: "video" };
  }
  const firstImage = post.images?.find(Boolean) ?? post.displayUrl;
  if (firstImage) {
    return { url: firstImage, mediaType: "image" };
  }

  for (const child of post.childPosts ?? []) {
    const asset = selectMediaAsset(child);
    if (asset) {
      return asset;
    }
  }

  throw new Error("Instagram post did not include downloadable media");
}

function buildMediaFilename(post: InstagramRecipePost, mediaType: MediaType) {
  const code = post.shortCode || post.id || "instagram-media";
  const extension = mediaType === "video" ? "mp4" : "jpg";
  return `${code}.${extension}`;
}

function resolveGeminiFileUri(file: {
  uri?: string | null;
  name?: string | null;
}) {
  return file?.uri ?? file?.name ?? null;
}

async function checkIfCancelled(importId: string): Promise<void> {
  const freshImport = await getImport(importId);
  if (!freshImport) {
    throw new Error(`Import ${importId} not found`);
  }
  if (
    freshImport.status === "failed" &&
    freshImport.error === "Import cancelled by user"
  ) {
    throw new Error("Import cancelled by user");
  }
}

async function runWithRetries<T>(
  importId: string,
  label: string,
  operation: () => Promise<T>
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < MAX_STAGE_ATTEMPTS) {
    // Check for cancellation before each attempt
    await checkIfCancelled(importId);

    attempt += 1;
    try {
      console.info(`[import ${importId}] ${label} (attempt ${attempt})`);
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(
        `[import ${importId}] ${label} failed on attempt ${attempt}: ${toErrorMessage(
          error
        )}`
      );
      if (attempt >= MAX_STAGE_ATTEMPTS) {
        break;
      }
      await delay(attempt * 500);
    }
  }

  throw lastError ?? new Error(`${label} failed`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}
