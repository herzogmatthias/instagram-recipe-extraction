/**
 * Firestore CRUD operations for recipes and imports.
 */

import type {
  InstagramRecipePost,
  RecipeStatus,
} from "@/models/InstagramRecipePost";
import type { RecipeImportDocument as RecipeImportRecord } from "@/models/RecipeImport";
import type {
  CreateImportInput,
  UpdateImportInput,
  RecipeUpsertInput,
  CreateVariantInput,
  RecipeVariantDocument,
  RecipeImportFirestoreRecord,
} from "./types";
import {
  getImportsCollection,
  getRecipesCollection,
  getVariantsCollection,
  Timestamp,
} from "./client";
import {
  expandRecipeDocument,
  deserializeImport,
  deserializeRecipe,
  deserializeVariant,
} from "./utils";

/**
 * Import operations
 */

export async function createImport(
  data: CreateImportInput
): Promise<RecipeImportRecord> {
  const col = getImportsCollection();
  const docRef = await col.add({
    inputUrl: data.inputUrl,
    status: data.status ?? "queued",
    stage: (data.stage ?? "queued") as RecipeImportFirestoreRecord["stage"],
    progress: data.progress ?? 0,
    recipeId: data.recipeId,
    metadata: data.metadata ?? {},
    error: data.error ?? null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  const snap = await docRef.get();
  return deserializeImport(snap);
}

export async function getImport(
  id: string
): Promise<RecipeImportRecord | null> {
  const col = getImportsCollection();
  const snap = await col.doc(id).get();
  if (!snap.exists) return null;
  return deserializeImport(snap);
}

export async function updateImport(
  id: string,
  data: UpdateImportInput
): Promise<void> {
  const col = getImportsCollection();
  await col.doc(id).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteImport(id: string): Promise<void> {
  const col = getImportsCollection();
  await col.doc(id).delete();
}

export async function listImports(options?: {
  statuses?: RecipeStatus[];
  limit?: number;
  status?: RecipeStatus;
  sortDirection?: "asc" | "desc";
  cursor?: string;
}): Promise<{
  imports: RecipeImportRecord[];
  nextCursor?: string;
}> {
  const col = getImportsCollection();
  const limit = options?.limit || 100;
  const sortDirection = options?.sortDirection || "desc";

  let query = col.orderBy("createdAt", sortDirection);

  // Handle both 'status' and 'statuses' for backward compatibility
  const statusFilter =
    options?.status ||
    (options?.statuses && options.statuses.length > 0
      ? options.statuses
      : undefined);

  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.where("status", "in", statusFilter) as any;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.where("status", "==", statusFilter) as any;
    }
  }

  if (options?.cursor) {
    const cursorDoc = await col.doc(options.cursor).get();
    if (cursorDoc.exists) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.startAfter(cursorDoc) as any;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query = query.limit(limit + 1) as any; // Fetch one extra to determine if there's a next page

  const snap = await query.get();
  const docs = snap.docs.slice(0, limit);
  const hasMore = snap.docs.length > limit;

  return {
    imports: docs.map((doc) => deserializeImport(doc)),
    nextCursor: hasMore ? docs[docs.length - 1].id : undefined,
  };
}

export async function findPendingImportByUrl(
  url: string
): Promise<RecipeImportRecord | null> {
  const col = getImportsCollection();
  const snap = await col
    .where("url", "==", url)
    .where("status", "in", ["queued", "scraping", "analyzing", "processing"])
    .limit(1)
    .get();

  if (snap.empty) return null;
  return deserializeImport(snap.docs[0]);
}

/**
 * Recipe operations
 */

export async function getRecipe(
  id: string
): Promise<InstagramRecipePost | null> {
  const col = getRecipesCollection();
  const snap = await col.doc(id).get();
  if (!snap.exists) return null;

  const recipeDoc = deserializeRecipe(snap);
  return expandRecipeDocument(recipeDoc);
}

export async function deleteRecipe(id: string): Promise<void> {
  const col = getRecipesCollection();
  await col.doc(id).delete();
}

export async function listRecipes(options?: {
  statuses?: RecipeStatus[];
  status?: RecipeStatus;
  limit?: number;
  sortDirection?: "asc" | "desc";
  cursor?: string;
}): Promise<{
  recipes: InstagramRecipePost[];
  nextCursor?: string;
}> {
  const col = getRecipesCollection();
  const limit = options?.limit || 100;
  const sortDirection = options?.sortDirection || "desc";

  let query = col.orderBy("createdAt", sortDirection);

  // Handle both 'status' and 'statuses' for backward compatibility
  const statusFilter =
    options?.status ||
    (options?.statuses && options.statuses.length > 0
      ? options.statuses
      : undefined);

  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.where("status", "in", statusFilter) as any;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.where("status", "==", statusFilter) as any;
    }
  }

  if (options?.cursor) {
    const cursorDoc = await col.doc(options.cursor).get();
    if (cursorDoc.exists) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.startAfter(cursorDoc) as any;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query = query.limit(limit + 1) as any; // Fetch one extra to determine if there's a next page

  const snap = await query.get();
  const docs = snap.docs.slice(0, limit);
  const hasMore = snap.docs.length > limit;

  return {
    recipes: docs.map((doc) => {
      const recipeDoc = deserializeRecipe(doc);
      return expandRecipeDocument(recipeDoc);
    }),
    nextCursor: hasMore ? docs[docs.length - 1].id : undefined,
  };
}

export async function findRecipeByUrl(
  url: string
): Promise<InstagramRecipePost | null> {
  const col = getRecipesCollection();
  const snap = await col.where("url", "==", url).limit(1).get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const recipeDoc = deserializeRecipe(doc);
  return expandRecipeDocument(recipeDoc);
}

export async function fetchRecipeDetail(
  id: string
): Promise<InstagramRecipePost | null> {
  // Same as getRecipe but with a different name for semantic clarity
  return getRecipe(id);
}

export async function createRecipe(
  data: RecipeUpsertInput
): Promise<InstagramRecipePost> {
  const col = getRecipesCollection();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, updatedAt, ...rest } = data;
  // @ts-expect-error - Firestore types don't allow add without id, but Firestore generates it
  const docRef = await col.add({
    ...rest,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const snap = await docRef.get();
  const recipeDoc = deserializeRecipe(snap);
  return expandRecipeDocument(recipeDoc);
}

export async function updateRecipe(
  id: string,
  data: RecipeUpsertInput
): Promise<void> {
  const col = getRecipesCollection();
  await col.doc(id).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Variant operations
 */

export async function createVariant(
  data: CreateVariantInput
): Promise<RecipeVariantDocument> {
  const col = getVariantsCollection(data.recipeId);
  const docRef = await col.add({
    recipeId: data.recipeId,
    name: data.name,
    recipe_data: data.recipe_data,
    isOriginal: data.isOriginal ?? false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const snap = await docRef.get();
  return deserializeVariant(snap);
}

export async function updateVariant(
  recipeId: string,
  variantId: string,
  data: Partial<CreateVariantInput>
): Promise<void> {
  const col = getVariantsCollection(recipeId);
  await col.doc(variantId).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteVariant(
  recipeId: string,
  variantId: string
): Promise<void> {
  const col = getVariantsCollection(recipeId);
  console.log(
    `Attempting to delete variant ${variantId} from collection path:`,
    col.path
  );
  const docRef = col.doc(variantId);
  console.log(`Document reference path:`, docRef.path);
  await docRef.delete();
  console.log(`Document delete() called successfully`);

  // Verify deletion
  const checkDoc = await docRef.get();
  console.log(
    `Verification - Document exists after deletion:`,
    checkDoc.exists
  );
}

export async function getVariant(
  recipeId: string,
  variantId: string
): Promise<RecipeVariantDocument | null> {
  const col = getVariantsCollection(recipeId);
  const snap = await col.doc(variantId).get();
  if (!snap.exists) return null;
  return deserializeVariant(snap);
}

export async function listVariants(
  recipeId: string
): Promise<RecipeVariantDocument[]> {
  const col = getVariantsCollection(recipeId);
  const snap = await col.orderBy("createdAt", "asc").get();
  return snap.docs.map((doc) => deserializeVariant(doc));
}
