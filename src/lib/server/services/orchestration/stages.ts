import type { RecipeStatus } from "@/models/InstagramRecipePost";
import { updateImport, getImport } from "../firestore";
import {
  STAGE_PROGRESS,
  type StageUpdateInput,
  type StageSetter,
} from "./types";

export function createStageSetter(stage: RecipeStatus): StageSetter {
  return async (importId: string, updates?: StageUpdateInput) => {
    const payload = {
      ...updates,
      status: stage,
      stage,
      progress: STAGE_PROGRESS[stage] ?? 0,
    };
    await updateImport(importId, payload);
    const updated = await getImport(importId);
    if (!updated) {
      throw new Error(`Import ${importId} not found after update`);
    }
    return updated;
  };
}

export const setQueued = createStageSetter("queued");
export const setScraping = createStageSetter("scraping");
export const setDownloadingMedia = createStageSetter("downloading_media");
export const setUploadingMedia = createStageSetter("uploading_media");
export const setExtracting = createStageSetter("extracting");
export const setReady = createStageSetter("ready");
export const setFailed = createStageSetter("failed");

export const STAGE_SETTERS: Record<RecipeStatus, StageSetter> = {
  queued: setQueued,
  scraping: setScraping,
  downloading_media: setDownloadingMedia,
  uploading_media: setUploadingMedia,
  extracting: setExtracting,
  ready: setReady,
  failed: setFailed,
};
