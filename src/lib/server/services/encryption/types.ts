/**
 * Encryption types for secrets management
 * Uses AES-256-GCM with Data Encryption Key (DEK) wrapping
 */

/**
 * Encrypted item with IV and authentication tag
 */
export type EncryptedItem = {
  ct: string; // base64-encoded ciphertext
  iv: string; // base64-encoded initialization vector (12 bytes for GCM)
  tag: string; // base64-encoded authentication tag (16 bytes for GCM)
};

/**
 * Secret item with encryption metadata
 */
export type SecretItem = {
  ct: string; // base64-encoded ciphertext
  iv: string; // base64-encoded initialization vector
  tag: string; // base64-encoded authentication tag
  last4?: string; // last 4 characters for display (API keys only)
  lastValidatedAt?: string; // ISO 8601 timestamp
};

/**
 * Complete encrypted secrets structure
 * Stored in Firestore userpreferences/{uid}.secrets
 */
export type EncryptedSecrets = {
  version: number; // encryption version for migration support
  dek_wrapped: string; // base64-encoded wrapped Data Encryption Key
  items: {
    APIFY_API_KEY?: SecretItem;
    GEMINI_API_KEY?: SecretItem;
    FIREBASE_SA_JSON?: SecretItem;
  };
  createdAt?: string; // ISO 8601 timestamp
  rotatedAt?: string; // ISO 8601 timestamp
};

/**
 * Plaintext secrets for encryption
 */
export type PlaintextSecrets = {
  APIFY_API_KEY?: string;
  GEMINI_API_KEY?: string;
  FIREBASE_SA_JSON?: string; // JSON string of service account
};

/**
 * Encryption error codes
 */
export type EncryptionErrorCode =
  | "MISSING_MASTER_KEY"
  | "INVALID_KEY_LENGTH"
  | "ENCRYPTION_FAILED"
  | "DECRYPTION_FAILED"
  | "INVALID_ENCRYPTED_DATA";

/**
 * Encryption error class
 */
export class EncryptionError extends Error {
  constructor(
    public readonly code: EncryptionErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "EncryptionError";
  }
}
