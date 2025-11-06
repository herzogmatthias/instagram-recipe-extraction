import type { RecipeStatus } from "./InstagramRecipePost";

export interface RecipeImportDocument {
  id: string;
  inputUrl: string;
  status: RecipeStatus;
  stage: RecipeStatus;
  progress: number;
  recipeId?: string;
  error?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
