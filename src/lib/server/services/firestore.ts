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

export interface RecipeImportDocument {
  id: string;
  inputUrl: string;
  status: RecipeStatus;
  progress: number;
  stage: string;
  recipeId?: string;
  error?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
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

let firestoreInstance: AdminFirestore | null = null;

function resolveServiceAccount(): ServiceAccount | undefined {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return normalizeServiceAccount(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    );
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    return undefined;
  }

  const absolutePath = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(process.cwd(), credentialsPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `GOOGLE_APPLICATION_CREDENTIALS file not found at ${absolutePath}`
    );
  }

  const fileContent = fs.readFileSync(absolutePath, "utf-8");
  return normalizeServiceAccount(JSON.parse(fileContent));
}

function normalizeServiceAccount(account: ServiceAccount): ServiceAccount {
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
  return serviceAccount
    ? initializeApp({ credential: cert(serviceAccount) })
    : initializeApp();
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
    recipeId: input.recipeId,
    error: input.error ?? null,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };

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
  const {
    createdAt,
    updatedAt: _ignoredUpdatedAt,
    id: _ignoredId,
    ...rest
  } = input;

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

export async function listRecipes(limit = 20): Promise<RecipeDocument[]> {
  const snapshot = await getRecipesCollection()
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => deserializeRecipe(doc));
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
