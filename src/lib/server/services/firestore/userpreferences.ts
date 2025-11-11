/**
 * UserPreferences Firestore operations
 * Manages user configuration stored in userpreferences/{uid} collection
 */

import { Timestamp, type DocumentReference } from "firebase-admin/firestore";
import { getFirestore } from "./client";
import type {
  UserPreferences,
  UserPreferencesDocument,
  FirebaseClientConfig,
  EncryptedSecrets,
  ModelPreference,
} from "@/models/UserPreferences";

export const USERPREFERENCES_COLLECTION = "userpreferences";

// For single-profile mode, use "singleton" as the document ID
export const DEFAULT_USER_ID = "singleton";

type UserPreferencesFirestoreRecord = Omit<
  UserPreferencesDocument,
  "uid" | "createdAt" | "updatedAt"
> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

function toIsoString(timestamp: Timestamp | undefined): string | undefined {
  return timestamp?.toDate().toISOString();
}

function deserializePreferences(
  uid: string,
  data: UserPreferencesFirestoreRecord | undefined
): UserPreferencesDocument | null {
  if (!data) {
    return null;
  }

  return {
    uid,
    clientConfig: data.clientConfig,
    secrets: data.secrets,
    modelPreference: data.modelPreference,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

/**
 * Get user preferences document reference
 */
function getUserPreferencesRef(
  uid: string = DEFAULT_USER_ID
): DocumentReference<UserPreferencesFirestoreRecord> {
  return getFirestore()
    .collection(USERPREFERENCES_COLLECTION)
    .doc(uid) as DocumentReference<UserPreferencesFirestoreRecord>;
}

/**
 * Get user preferences for a specific user
 * Returns null if document doesn't exist
 */
export async function getUserPreferences(
  uid: string = DEFAULT_USER_ID
): Promise<UserPreferencesDocument | null> {
  const docRef = getUserPreferencesRef(uid);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return null;
  }

  return deserializePreferences(uid, snapshot.data());
}

/**
 * Set Firebase Client configuration
 * Creates document if it doesn't exist
 */
export async function setClientConfig(
  config: FirebaseClientConfig,
  uid: string = DEFAULT_USER_ID
): Promise<UserPreferencesDocument> {
  const docRef = getUserPreferencesRef(uid);
  const now = Timestamp.now();

  const existing = await docRef.get();

  if (existing.exists) {
    await docRef.update({
      clientConfig: config,
      updatedAt: now,
    });
  } else {
    await docRef.set({
      clientConfig: config,
      createdAt: now,
      updatedAt: now,
    });
  }

  const updated = await docRef.get();
  return deserializePreferences(uid, updated.data())!;
}

/**
 * Set encrypted secrets
 * Creates document if it doesn't exist
 */
export async function setSecrets(
  secrets: EncryptedSecrets,
  uid: string = DEFAULT_USER_ID
): Promise<UserPreferencesDocument> {
  const docRef = getUserPreferencesRef(uid);
  const now = Timestamp.now();

  const existing = await docRef.get();

  if (existing.exists) {
    await docRef.update({
      secrets: secrets,
      updatedAt: now,
    });
  } else {
    await docRef.set({
      secrets: secrets,
      createdAt: now,
      updatedAt: now,
    });
  }

  const updated = await docRef.get();
  return deserializePreferences(uid, updated.data())!;
}

/**
 * Set model preference
 * Creates document if it doesn't exist
 */
export async function setModelPreference(
  modelPreference: ModelPreference,
  uid: string = DEFAULT_USER_ID
): Promise<UserPreferencesDocument> {
  const docRef = getUserPreferencesRef(uid);
  const now = Timestamp.now();

  const existing = await docRef.get();

  if (existing.exists) {
    await docRef.update({
      modelPreference: modelPreference,
      updatedAt: now,
    });
  } else {
    await docRef.set({
      modelPreference: modelPreference,
      createdAt: now,
      updatedAt: now,
    });
  }

  const updated = await docRef.get();
  return deserializePreferences(uid, updated.data())!;
}

/**
 * Delete a specific secret from the secrets object
 * Service names: "APIFY_API_KEY", "GEMINI_API_KEY", "FIREBASE_SA_JSON"
 */
export async function deleteSecret(
  serviceName: keyof EncryptedSecrets["items"],
  uid: string = DEFAULT_USER_ID
): Promise<UserPreferencesDocument | null> {
  const docRef = getUserPreferencesRef(uid);
  const now = Timestamp.now();

  const existing = await docRef.get();

  if (!existing.exists || !existing.data()?.secrets) {
    return null;
  }

  const currentSecrets = existing.data()!.secrets!;
  const updatedItems = { ...currentSecrets.items };
  delete updatedItems[serviceName];

  const updatedSecrets: EncryptedSecrets = {
    ...currentSecrets,
    items: updatedItems,
  };

  await docRef.update({
    secrets: updatedSecrets,
    updatedAt: now,
  });

  const updated = await docRef.get();
  return deserializePreferences(uid, updated.data());
}

/**
 * Delete entire user preferences document
 * Used for testing or complete reset
 */
export async function deleteUserPreferences(
  uid: string = DEFAULT_USER_ID
): Promise<void> {
  const docRef = getUserPreferencesRef(uid);
  await docRef.delete();
}

/**
 * Reset Firestore client for testing
 * @internal
 */
export function __resetUserPreferencesForTests() {
  // Firestore client reset is handled by the main firestore client module
  // This is a no-op placeholder for consistency with other modules
}
