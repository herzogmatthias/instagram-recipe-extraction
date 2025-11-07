import type { RecipeStatus } from "@/models/InstagramRecipePost";
import type { RecipeImportDocument } from "@/models/RecipeImport";
import type { UpdateImportInput } from "../firestore";

export const STAGE_PROGRESS: Record<RecipeStatus, number> = {
  queued: 0,
  scraping: 15,
  downloading_media: 35,
  uploading_media: 55,
  extracting: 80,
  ready: 100,
  failed: 100,
};

export const MAX_STAGE_ATTEMPTS = 3;

export type StageUpdateInput = Omit<
  UpdateImportInput,
  "status" | "stage" | "progress"
>;

export type StageTransitionOptions = Omit<StageUpdateInput, "metadata"> & {
  metadataPatch?: Record<string, unknown>;
};

export type StageSetter = (
  importId: string,
  updates?: StageUpdateInput
) => Promise<RecipeImportDocument>;
