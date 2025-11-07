import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import {
  getFirestore as getAdminFirestore,
  Timestamp,
  type CollectionReference,
  type DocumentReference,
  type Firestore as AdminFirestore,
} from "firebase-admin/firestore";
import type { ServiceAccount } from "firebase-admin";
import type {
  InstagramRecipePost,
  RecipeStatus,
} from "@/models/InstagramRecipePost";
import type { RecipeImportDocument } from "@/models/RecipeImport";

/**
 * Firestore schema overview
 * ------------------------
 * - imports/{importId}
 *   Tracks the ingestion job lifecycle with metadata so the UI can stream progress.
 *   {
 *     inputUrl: string;
 *     status: RecipeStatus;
 *     stage: string; // processing stage identifier (mirrors status history)
 *     progress: number; // 0-100
 *     recipeId?: string;
 *     error?: string | null;
 *     metadata?: Record<string, unknown>;
 *     createdAt: Timestamp;
 *     updatedAt: Timestamp;
 *   }
 * - recipes/{recipeId}
 *   Stores the normalized Instagram post payload alongside Gemini output. Media is referenced
 *   by URL only; binary assets are never persisted in Firestore.
 *   Extends InstagramRecipePost with importId, geminiFileUri, createdAt, updatedAt fields.
 */

const IMPORTS_COLLECTION = "imports";
const RECIPES_COLLECTION = "recipes";
const VARIANTS_SUBCOLLECTION = "variants";

declare global {
  var __ADMIN_APP__: App | undefined;
  var __ADMIN_DB__: AdminFirestore | undefined;
  var __ADMIN_DB_SETTINGS_APPLIED__: boolean | undefined;
}

type RecipeImportFirestoreRecord = Omit<
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

type RecipeFirestoreRecord = Omit<RecipeDocument, "createdAt" | "updatedAt"> & {
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

function resolveServiceAccount(): ServiceAccount | undefined {
  const credentialsPath = path.resolve(
    process.cwd(),
    "firebase",
    "serviceAccountKey.json"
  );

  if (!fs.existsSync(credentialsPath)) {
    return undefined;
  }

  const fileContent = fs.readFileSync(credentialsPath, "utf-8");
  const account = JSON.parse(fileContent) as ServiceAccount;

  if (account.privateKey) {
    return { ...account, privateKey: account.privateKey.replace(/\\n/g, "\n") };
  }
  return account;
}

export function getFirestore(): AdminFirestore {
  // 1) App: create once or reuse default
  if (!globalThis.__ADMIN_APP__) {
    if (getApps().length === 0) {
      const sa = resolveServiceAccount();
      globalThis.__ADMIN_APP__ = sa
        ? initializeApp({ credential: cert(sa) })
        : initializeApp(); // uses ADC if available
    } else {
      globalThis.__ADMIN_APP__ = getApps()[0]!;
    }
  }

  // 2) Firestore: create once
  if (!globalThis.__ADMIN_DB__) {
    globalThis.__ADMIN_DB__ = getAdminFirestore(globalThis.__ADMIN_APP__);
  }

  // 3) Settings: apply ONCE, before any use
  if (!globalThis.__ADMIN_DB_SETTINGS_APPLIED__) {
    globalThis.__ADMIN_DB__!.settings({ ignoreUndefinedProperties: true });
    globalThis.__ADMIN_DB_SETTINGS_APPLIED__ = true;
  }

  return globalThis.__ADMIN_DB__!;
}

export function getImportsCollection(): CollectionReference<RecipeImportFirestoreRecord> {
  return getFirestore().collection(
    IMPORTS_COLLECTION
  ) as CollectionReference<RecipeImportFirestoreRecord>;
}

export function getRecipesCollection(): CollectionReference<RecipeFirestoreRecord> {
  return getFirestore().collection(
    RECIPES_COLLECTION
  ) as CollectionReference<RecipeFirestoreRecord>;
}

export async function findRecipeByUrl(
  inputUrl: string
): Promise<RecipeDocument | null> {
  if (!inputUrl) {
    return null;
  }
  const snapshot = await getRecipesCollection()
    .where("inputUrl", "==", inputUrl)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  return deserializeRecipe(snapshot.docs[0]!);
}

export async function findPendingImportByUrl(
  inputUrl: string
): Promise<RecipeImportDocument | null> {
  if (!inputUrl) {
    return null;
  }
  const snapshot = await getImportsCollection()
    .where("inputUrl", "==", inputUrl)
    .where("status", "in", ["queued", "fetching", "analyzing"])
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  return deserializeImport(snapshot.docs[0]!);
}

export async function createImport(
  input: CreateImportInput
): Promise<RecipeImportDocument> {
  if (!input.inputUrl) {
    throw new Error("createImport: inputUrl is required");
  }

  const collection = getImportsCollection();
  const docRef = input.id ? collection.doc(input.id) : collection.doc();
  const now = Timestamp.now();
  const payload: RecipeImportFirestoreRecord = {
    inputUrl: input.inputUrl,
    status: input.status ?? "queued",
    stage: input.stage ?? "queued",
    progress: Math.max(0, Math.min(100, input.progress ?? 0)),
    ...(input.recipeId !== undefined && { recipeId: input.recipeId }),
    error: input.error ?? null,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  } as RecipeImportFirestoreRecord;

  await docRef.set(payload);
  const snapshot = await docRef.get();
  return deserializeImport(snapshot);
}

export async function updateImport(
  id: string,
  updates: UpdateImportInput
): Promise<RecipeImportDocument> {
  if (!id) {
    throw new Error("updateImport: id is required");
  }

  const docRef = getImportsCollection().doc(id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new Error(`Import ${id} not found`);
  }

  const sanitized: Partial<RecipeImportFirestoreRecord> = {
    ...updates,
    updatedAt: Timestamp.now(),
  } as Partial<RecipeImportFirestoreRecord>;

  if (typeof updates.progress === "number") {
    sanitized.progress = Math.max(0, Math.min(100, updates.progress));
  }

  await docRef.set(sanitized, { merge: true });
  const updatedSnapshot = await docRef.get();
  return deserializeImport(updatedSnapshot);
}

export async function getImport(
  id: string
): Promise<RecipeImportDocument | null> {
  if (!id) {
    return null;
  }
  const doc = await getImportsCollection().doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return deserializeImport(doc);
}

type ListImportsOptions = {
  limit?: number;
  status?: RecipeStatus;
  sortDirection?: "asc" | "desc";
  cursor?: string;
};

export async function listImports(options?: ListImportsOptions): Promise<{
  imports: RecipeImportDocument[];
  nextCursor: string | null;
}> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const sortDirection = options?.sortDirection === "asc" ? "asc" : "desc";
  let query: FirebaseFirestore.Query<RecipeImportFirestoreRecord> =
    getImportsCollection().orderBy("createdAt", sortDirection);

  if (options?.status) {
    query = query.where("status", "==", options.status);
  }

  if (options?.cursor) {
    const cursorDate = new Date(options.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      query = query.startAfter(Timestamp.fromDate(cursorDate));
    }
  }

  query = query.limit(limit);
  const snapshot = await query.get();
  const imports = snapshot.docs.map((doc) => deserializeImport(doc));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor =
    snapshot.size === limit && lastDoc?.data()?.createdAt
      ? toIsoString(lastDoc.data()!.createdAt) ?? null
      : null;

  return { imports, nextCursor };
}

export async function deleteImport(id: string): Promise<void> {
  if (!id) {
    throw new Error("deleteImport: id is required");
  }
  await getImportsCollection().doc(id).delete();
}

export async function createRecipe(
  input: RecipeUpsertInput
): Promise<RecipeDocument> {
  const collection = getRecipesCollection();
  const docRef: DocumentReference<RecipeFirestoreRecord> = input.id
    ? collection.doc(input.id)
    : collection.doc();
  const now = Timestamp.now();
  const { createdAt, ...rest } = input;

  if (!rest.inputUrl) {
    throw new Error("createRecipe: inputUrl is required");
  }

  const payload: RecipeFirestoreRecord = {
    ...(rest as Omit<RecipeFirestoreRecord, "createdAt" | "updatedAt">),
    id: docRef.id,
    createdAt: coerceTimestamp(createdAt) ?? now,
    updatedAt: now,
  };

  await docRef.set(payload);
  const snapshot = await docRef.get();
  return deserializeRecipe(snapshot);
}

export async function getRecipe(id: string): Promise<RecipeDocument | null> {
  if (!id) {
    return null;
  }
  const doc = await getRecipesCollection().doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return deserializeRecipe(doc);
}

export async function fetchRecipeDetail(
  id: string
): Promise<InstagramRecipePost | null> {
  const recipe = await getRecipe(id);
  if (!recipe) {
    return null;
  }
  return expandRecipeDocument(recipe);
}

export async function deleteRecipe(id: string): Promise<void> {
  if (!id) {
    throw new Error("deleteRecipe: id is required");
  }
  await getRecipesCollection().doc(id).delete();
}

type ListRecipesOptions = {
  limit?: number;
  status?: RecipeStatus;
  sortDirection?: "asc" | "desc";
  cursor?: string;
};

export async function listRecipes(options?: ListRecipesOptions): Promise<{
  recipes: RecipeDocument[];
  nextCursor: string | null;
}> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
  const sortDirection = options?.sortDirection === "asc" ? "asc" : "desc";
  let query: FirebaseFirestore.Query<RecipeFirestoreRecord> =
    getRecipesCollection().orderBy("createdAt", sortDirection);

  if (options?.status) {
    query = query.where("status", "==", options.status);
  }

  if (options?.cursor) {
    const cursorDate = new Date(options.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      query = query.startAfter(Timestamp.fromDate(cursorDate));
    }
  }

  query = query.limit(limit);
  const snapshot = await query.get();
  const recipes = snapshot.docs.map((doc) => deserializeRecipe(doc));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor =
    snapshot.size === limit && lastDoc?.data()?.createdAt
      ? toIsoString(lastDoc.data()!.createdAt) ?? null
      : null;

  return { recipes, nextCursor };
}

// ==================== Variant CRUD Operations ====================

export type RecipeVariantDocument = {
  id: string;
  recipeId: string;
  name: string;
  isOriginal: boolean;
  recipe_data: InstagramRecipePost["recipe_data"];
  createdAt?: string;
  updatedAt?: string;
};

type RecipeVariantFirestoreRecord = Omit<
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

function getVariantsCollection(
  recipeId: string
): CollectionReference<RecipeVariantFirestoreRecord> {
  return getRecipesCollection()
    .doc(recipeId)
    .collection(
      VARIANTS_SUBCOLLECTION
    ) as CollectionReference<RecipeVariantFirestoreRecord>;
}

/**
 * Create a new recipe variant
 * @param input - Variant data with recipeId, name, and recipe_data
 * @returns The created variant document
 */
export async function createVariant(
  input: CreateVariantInput
): Promise<RecipeVariantDocument> {
  if (!input.recipeId) {
    throw new Error("createVariant: recipeId is required");
  }
  if (!input.name) {
    throw new Error("createVariant: name is required");
  }
  if (!input.recipe_data) {
    throw new Error("createVariant: recipe_data is required");
  }

  const collection = getVariantsCollection(input.recipeId);
  const docRef = collection.doc();
  const now = Timestamp.now();

  const payload: RecipeVariantFirestoreRecord = {
    recipeId: input.recipeId,
    name: input.name,
    isOriginal: input.isOriginal ?? false,
    recipe_data: input.recipe_data,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(payload);
  const snapshot = await docRef.get();
  return deserializeVariant(snapshot);
}

/**
 * List all variants for a recipe
 * @param recipeId - The recipe ID
 * @returns Array of variant documents
 */
export async function listVariants(
  recipeId: string
): Promise<RecipeVariantDocument[]> {
  if (!recipeId) {
    throw new Error("listVariants: recipeId is required");
  }

  const collection = getVariantsCollection(recipeId);
  const snapshot = await collection.orderBy("createdAt", "asc").get();

  return snapshot.docs.map((doc) => deserializeVariant(doc));
}

/**
 * Delete a variant. Guards against deleting the original variant.
 * @param recipeId - The recipe ID
 * @param variantId - The variant ID to delete
 * @throws Error if attempting to delete the original variant
 */
export async function deleteVariant(
  recipeId: string,
  variantId: string
): Promise<void> {
  if (!recipeId) {
    throw new Error("deleteVariant: recipeId is required");
  }
  if (!variantId) {
    throw new Error("deleteVariant: variantId is required");
  }

  const docRef = getVariantsCollection(recipeId).doc(variantId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error(`Variant ${variantId} not found`);
  }

  const data = snapshot.data();
  if (data?.isOriginal) {
    throw new Error("Cannot delete the original variant");
  }

  await docRef.delete();
}

/**
 * Update a variant's name
 * @param recipeId - The recipe ID
 * @param variantId - The variant ID to update
 * @param name - The new name
 * @returns The updated variant document
 */
export async function updateVariantName(
  recipeId: string,
  variantId: string,
  name: string
): Promise<RecipeVariantDocument> {
  if (!recipeId) {
    throw new Error("updateVariantName: recipeId is required");
  }
  if (!variantId) {
    throw new Error("updateVariantName: variantId is required");
  }
  if (!name) {
    throw new Error("updateVariantName: name is required");
  }

  const docRef = getVariantsCollection(recipeId).doc(variantId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error(`Variant ${variantId} not found`);
  }

  await docRef.update({
    name,
    updatedAt: Timestamp.now(),
  });

  const updatedSnapshot = await docRef.get();
  return deserializeVariant(updatedSnapshot);
}

function deserializeVariant(
  snapshot: FirebaseFirestore.DocumentSnapshot<RecipeVariantFirestoreRecord>
): RecipeVariantDocument {
  const data = snapshot.data();
  if (!data) {
    throw new Error(`Variant ${snapshot.id} has no data`);
  }
  return {
    id: snapshot.id,
    recipeId: data.recipeId,
    name: data.name,
    isOriginal: data.isOriginal,
    recipe_data: data.recipe_data,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

// ==================== Helper Functions ====================

function deserializeImport(
  snapshot: FirebaseFirestore.DocumentSnapshot<RecipeImportFirestoreRecord>
): RecipeImportDocument {
  const data = snapshot.data();
  if (!data) {
    throw new Error(`Import ${snapshot.id} has no data`);
  }
  return {
    id: snapshot.id,
    inputUrl: data.inputUrl,
    status: data.status,
    stage: data.stage,
    progress: data.progress,
    recipeId: data.recipeId,
    error: data.error,
    metadata: data.metadata ?? {},
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function deserializeRecipe(
  snapshot: FirebaseFirestore.DocumentSnapshot<RecipeFirestoreRecord>
): RecipeDocument {
  const data = snapshot.data();
  if (!data) {
    throw new Error(`Recipe ${snapshot.id} has no data`);
  }
  return {
    ...(data as unknown as Omit<
      RecipeDocument,
      "id" | "createdAt" | "updatedAt"
    >),
    id: snapshot.id,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function toIsoString(value?: unknown): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

function expandRecipeDocument(doc: RecipeDocument): InstagramRecipePost {
  const fallbackStepMedia =
    doc.recipe_data?.steps
      ?.map((step) => step.chefs_note)
      .find(
        (note): note is string =>
          typeof note === "string" && note.startsWith("http")
      ) ?? null;

  const displayUrl =
    doc.displayUrl ?? doc.images?.find(Boolean) ?? fallbackStepMedia;

  return {
    inputUrl: doc.inputUrl,
    id: doc.id,
    type: doc.type ?? "Video",
    shortCode: doc.shortCode ?? doc.id,
    caption: doc.caption ?? "",
    hashtags: doc.hashtags ?? [],
    mentions: doc.mentions ?? [],
    url: doc.url ?? doc.inputUrl,
    commentsCount: doc.commentsCount ?? 0,
    firstComment: doc.firstComment ?? null,
    latestComments: doc.latestComments ?? [],
    dimensionsHeight: doc.dimensionsHeight ?? null,
    dimensionsWidth: doc.dimensionsWidth ?? null,
    displayUrl,
    images: doc.images ?? (displayUrl ? [displayUrl] : []),
    videoUrl: doc.videoUrl ?? null,
    alt: doc.alt ?? null,
    likesCount: doc.likesCount ?? 0,
    videoViewCount: doc.videoViewCount ?? null,
    videoPlayCount: doc.videoPlayCount ?? null,
    timestamp: doc.timestamp ?? doc.createdAt ?? new Date().toISOString(),
    childPosts: doc.childPosts ?? [],
    ownerFullName: doc.ownerFullName ?? null,
    ownerUsername: doc.ownerUsername ?? "unknown",
    ownerId: doc.ownerId ?? "unknown",
    productType: doc.productType ?? "feed",
    videoDuration: doc.videoDuration ?? null,
    isSponsored: doc.isSponsored ?? false,
    musicInfo: doc.musicInfo,
    isCommentsDisabled: doc.isCommentsDisabled ?? false,
    recipe_data: doc.recipe_data,
    status: doc.status ?? "ready",
    progress: typeof doc.progress === "number" ? doc.progress : 100,
    error: doc.error,
    createdAt: doc.createdAt,
  };
}

function coerceTimestamp(
  value?: string | Date | Timestamp
): Timestamp | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Timestamp) {
    return value;
  }
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  if (typeof value === "string") {
    return Timestamp.fromDate(new Date(value));
  }
  return undefined;
}
