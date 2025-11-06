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

let firestoreInstance: AdminFirestore | null = null;

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

function initializeFirebaseAdmin(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const serviceAccount = resolveServiceAccount();

  if (serviceAccount) {
    return initializeApp({ credential: cert(serviceAccount) });
  }

  // Fallback: use project ID from environment if no service account
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "Firebase Admin initialization failed: Either GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT, or NEXT_PUBLIC_FIREBASE_PROJECT_ID must be configured"
    );
  }

  return initializeApp({ projectId });
}

export function getFirestore(): AdminFirestore {
  if (!firestoreInstance) {
    const app = initializeFirebaseAdmin();
    firestoreInstance = getAdminFirestore(app);
  }
  return firestoreInstance;
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

/**
 * Testing helper to reset cached Firestore references between test cases.
 */
export function __resetFirestoreForTests() {
  firestoreInstance = null;
}
