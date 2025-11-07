import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import {
  getFirestore as getAdminFirestore,
  Timestamp,
  type CollectionReference,
  type Firestore as AdminFirestore,
} from "firebase-admin/firestore";
import type { ServiceAccount } from "firebase-admin";
import type {
  RecipeImportFirestoreRecord,
  RecipeFirestoreRecord,
  RecipeVariantFirestoreRecord,
} from "./types";

export const IMPORTS_COLLECTION = "imports";
export const RECIPES_COLLECTION = "recipes";
export const VARIANTS_SUBCOLLECTION = "variants";

declare global {
  var __ADMIN_APP__: App | undefined;
  var __ADMIN_DB__: AdminFirestore | undefined;
  var __ADMIN_DB_SETTINGS_APPLIED__: boolean | undefined;
}

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
  if (!globalThis.__ADMIN_APP__) {
    if (getApps().length === 0) {
      const sa = resolveServiceAccount();
      globalThis.__ADMIN_APP__ = sa
        ? initializeApp({ credential: cert(sa) })
        : initializeApp();
    } else {
      globalThis.__ADMIN_APP__ = getApps()[0]!;
    }
  }

  if (!globalThis.__ADMIN_DB__) {
    globalThis.__ADMIN_DB__ = getAdminFirestore(globalThis.__ADMIN_APP__);
  }

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

export function getVariantsCollection(
  recipeId: string
): CollectionReference<RecipeVariantFirestoreRecord> {
  return getRecipesCollection()
    .doc(recipeId)
    .collection(
      VARIANTS_SUBCOLLECTION
    ) as CollectionReference<RecipeVariantFirestoreRecord>;
}

export { Timestamp };
