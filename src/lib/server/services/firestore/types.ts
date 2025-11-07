import type {
  InstagramRecipePost,
  RecipeStatus,
} from "@/models/InstagramRecipePost";
import type { RecipeImportDocument } from "@/models/RecipeImport";
import type { Timestamp } from "firebase-admin/firestore";

export type RecipeImportFirestoreRecord = Omit<
  RecipeImportDocument,
  "id" | "createdAt" | "updatedAt"
> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type RecipeDocument = Partial<InstagramRecipePost> & {
  id: string;
  inputUrl: string;
  importId?: string;
  geminiFileUri?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RecipeFirestoreRecord = Omit<
  RecipeDocument,
  "createdAt" | "updatedAt"
> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type CreateImportInput = {
  id?: string;
  inputUrl: string;
  status?: RecipeStatus;
  stage?: string;
  progress?: number;
  recipeId?: string;
  metadata?: Record<string, unknown>;
  error?: string | null;
};

export type UpdateImportInput = Partial<
  Omit<RecipeImportDocument, "id" | "createdAt" | "updatedAt" | "inputUrl">
>;

export type RecipeUpsertInput = Partial<RecipeDocument> &
  Pick<RecipeDocument, "inputUrl"> & { id?: string };

export type RecipeVariantDocument = {
  id: string;
  recipeId: string;
  name: string;
  isOriginal: boolean;
  recipe_data: InstagramRecipePost["recipe_data"];
  createdAt?: string;
  updatedAt?: string;
};

export type RecipeVariantFirestoreRecord = Omit<
  RecipeVariantDocument,
  "id" | "createdAt" | "updatedAt"
> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type CreateVariantInput = {
  recipeId: string;
  name: string;
  recipe_data: InstagramRecipePost["recipe_data"];
  isOriginal?: boolean;
};

export type ListImportsOptions = {
  limit?: number;
  status?: RecipeStatus;
  sortDirection?: "asc" | "desc";
  cursor?: string;
};

export type ListRecipesOptions = {
  limit?: number;
  status?: RecipeStatus;
  sortDirection?: "asc" | "desc";
  cursor?: string;
};
