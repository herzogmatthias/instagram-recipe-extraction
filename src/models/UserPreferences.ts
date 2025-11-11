/**
 * UserPreferences data model
 * Represents the configuration and secrets stored in Firestore userpreferences collection
 * Each user has a single preferences document at userpreferences/{uid}
 * For single-profile mode, use document ID "singleton"
 */

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  lastValidatedAt?: string; // ISO 8601 timestamp
};

export type EncryptedSecretItem = {
  ct: string; // base64-encoded ciphertext
  iv: string; // base64-encoded initialization vector
  tag: string; // base64-encoded authentication tag
  last4?: string; // last 4 characters for display (API keys only)
  lastValidatedAt?: string; // ISO 8601 timestamp
};

export type EncryptedSecrets = {
  version: number; // encryption version for migration support
  dek_wrapped: string; // base64-encoded wrapped Data Encryption Key
  items: {
    APIFY_API_KEY?: EncryptedSecretItem;
    GEMINI_API_KEY?: EncryptedSecretItem;
    FIREBASE_SA_JSON?: EncryptedSecretItem;
  };
  createdAt?: string; // ISO 8601 timestamp
  rotatedAt?: string; // ISO 8601 timestamp
};

export type ModelPreference = {
  geminiDefaultModel: string; // e.g., "gemini-2.0-pro-exp-02-05"
  lastValidatedAt?: string; // ISO 8601 timestamp
};

/**
 * Complete UserPreferences document structure
 * Stored at: userpreferences/{uid} or userpreferences/singleton
 */
export type UserPreferences = {
  clientConfig?: FirebaseClientConfig;
  secrets?: EncryptedSecrets;
  modelPreference?: ModelPreference;
};

/**
 * Firestore document type with server timestamps
 * Used internally by Firestore operations
 */
export type UserPreferencesDocument = UserPreferences & {
  uid: string; // document ID
  createdAt?: string;
  updatedAt?: string;
};
