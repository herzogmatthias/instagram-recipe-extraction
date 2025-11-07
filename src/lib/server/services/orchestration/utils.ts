import type { InstagramRecipePost } from "@/models/InstagramRecipePost";
import type { RecipeImportDocument } from "@/models/RecipeImport";
import type { MediaType } from "../media";
import type { StageTransitionOptions } from "./types";
import { MAX_STAGE_ATTEMPTS } from "./types";
import { getImport } from "../firestore";

export function buildStageUpdatePayload(
  currentImport: RecipeImportDocument,
  options?: StageTransitionOptions
) {
  const { metadataPatch, ...rest } = options ?? {};
  return {
    ...rest,
    metadata: metadataPatch
      ? { ...currentImport.metadata, ...metadataPatch }
      : currentImport.metadata,
  };
}

export function stageMetadata(
  stage: string,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  return {
    [`${stage}StartedAt`]: new Date().toISOString(),
    ...extra,
  };
}

export function selectMediaAsset(post: InstagramRecipePost): {
  url: string;
  mediaType: MediaType;
} {
  if (post.videoUrl) {
    return { url: post.videoUrl, mediaType: "video" };
  }
  const firstImage = post.images?.[0] ?? post.displayUrl;
  if (firstImage) {
    return { url: firstImage, mediaType: "image" };
  }
  throw new Error("No suitable media asset found on Instagram post");
}

export function buildMediaFilename(
  post: InstagramRecipePost,
  mediaType: MediaType
): string {
  const code = post.shortCode ?? post.id;
  const extension = mediaType === "video" ? "mp4" : "jpg";
  return `${code}.${extension}`;
}

export function resolveGeminiFileUri(
  file: { name?: string; uri?: string } | null | undefined
): string | null {
  if (!file) return null;
  return file.uri ?? file.name ?? null;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

export async function checkIfCancelled(importId: string): Promise<void> {
  const current = await getImport(importId);
  if (current?.status === "failed" && current?.error?.includes("Cancelled")) {
    throw new Error("Import was cancelled");
  }
}

export async function runWithRetries<T>(
  importId: string,
  label: string,
  operation: () => Promise<T>
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < MAX_STAGE_ATTEMPTS) {
    attempt += 1;
    try {
      console.info(`[import ${importId}] ${label} (attempt ${attempt})`);
      const result = await operation();
      if (attempt > 1) {
        console.info(`[import ${importId}] ${label} succeeded on retry`);
      }
      return result;
    } catch (error) {
      lastError = error;
      console.warn(
        `[import ${importId}] ${label} failed (attempt ${attempt}): ${toErrorMessage(
          error
        )}`
      );
      if (attempt >= MAX_STAGE_ATTEMPTS) {
        break;
      }
      const backoff = Math.min(1000 * 2 ** (attempt - 1), 10_000);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw (
    lastError ??
    new Error(`${label} failed after ${MAX_STAGE_ATTEMPTS} attempts`)
  );
}
