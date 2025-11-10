import type { RecipeStatus } from "@/models/InstagramRecipePost";
import {
  getImport,
  getRecipe,
  createRecipe,
  type RecipeDocument,
} from "../firestore";
import { scrapeInstagramPost } from "../apify";
import { cleanupMedia, downloadMedia } from "../media";
import { extractRecipe, uploadToGemini } from "../gemini";
import { STAGE_SETTERS, setFailed } from "./stages";
import type { StageTransitionOptions } from "./types";
import {
  buildStageUpdatePayload,
  stageMetadata,
  selectMediaAsset,
  buildMediaFilename,
  resolveGeminiFileUri,
  toErrorMessage,
  checkIfCancelled,
  runWithRetries,
} from "./utils";

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
      recipe_data: extraction.recipe
        ? { ...extraction.recipe, isOriginal: true }
        : undefined,
    });

    await transition("ready", {
      recipeId: recipeDoc.id,
      error: null,
      metadataPatch: stageMetadata("ready"),
    });

    console.info(`[import ${importId}] Recipe ${recipeDoc.id} ready`);
    return recipeDoc;
  } catch (error) {
    const message = toErrorMessage(error);
    console.error(
      `[import ${importId}] Failed at stage ${currentStage}: ${message}`
    );
    currentImport = await setFailed(importId, {
      error: message,
      metadata: { ...currentImport.metadata, failedStage: currentStage },
    });
    throw error;
  } finally {
    if (downloadedMediaPath) {
      await cleanupMedia(downloadedMediaPath).catch((err) => {
        console.warn(
          `[import ${importId}] Failed to clean up ${downloadedMediaPath}:`,
          err
        );
      });
    }
  }
}
