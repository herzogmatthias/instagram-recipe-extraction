/**
 * Encryption utilities for secrets management
 * Uses AES-256-GCM with Data Encryption Key (DEK) wrapping
 *
 * Architecture:
 * 1. Master Key (from env) encrypts the DEK
 * 2. DEK encrypts individual secrets
 * 3. DEK is rotated per user, Master Key stays constant
 */

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { EncryptionError, type EncryptedItem } from "./types";

// Constants for AES-256-GCM
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const TAG_LENGTH = 16; // 128 bits (default for GCM)

/**
 * Get master encryption key from environment
 * Must be a 32-byte (64 hex characters) key
 */
export function getMasterKey(): Buffer {
  const masterKeyHex = process.env.ENCRYPTION_MASTER_KEY;

  if (!masterKeyHex) {
    throw new EncryptionError(
      "MISSING_MASTER_KEY",
      "ENCRYPTION_MASTER_KEY environment variable is not set. Generate with: openssl rand -hex 32"
    );
  }

  if (masterKeyHex.length !== KEY_LENGTH * 2) {
    throw new EncryptionError(
      "INVALID_KEY_LENGTH",
      `ENCRYPTION_MASTER_KEY must be ${
        KEY_LENGTH * 2
      } hex characters (${KEY_LENGTH} bytes)`
    );
  }

  return Buffer.from(masterKeyHex, "hex");
}

/**
 * Generate a random Data Encryption Key (DEK)
 * DEK is used to encrypt individual secrets
 * Returns 32-byte key as Buffer
 */
export function generateDEK(): Buffer {
  return randomBytes(KEY_LENGTH);
}

/**
 * Wrap (encrypt) a DEK with the master key
 * Returns base64-encoded encrypted DEK with IV and tag
 */
export function wrapDEK(dek: Buffer, masterKey?: Buffer): string {
  try {
    const key = masterKey || getMasterKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Format: iv:tag:ciphertext (all base64)
    return `${iv.toString("base64")}:${tag.toString(
      "base64"
    )}:${encrypted.toString("base64")}`;
  } catch (error) {
    // Re-throw EncryptionErrors directly
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError("ENCRYPTION_FAILED", "Failed to wrap DEK", error);
  }
}

/**
 * Unwrap (decrypt) a DEK with the master key
 * Returns the plaintext DEK as Buffer
 */
export function unwrapDEK(wrappedDEK: string, masterKey?: Buffer): Buffer {
  try {
    const key = masterKey || getMasterKey();
    const parts = wrappedDEK.split(":");

    if (parts.length !== 3) {
      throw new Error(
        "Invalid wrapped DEK format. Expected: iv:tag:ciphertext"
      );
    }

    const iv = Buffer.from(parts[0]!, "base64");
    const tag = Buffer.from(parts[1]!, "base64");
    const encrypted = Buffer.from(parts[2]!, "base64");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch (error) {
    throw new EncryptionError(
      "DECRYPTION_FAILED",
      "Failed to unwrap DEK",
      error
    );
  }
}

/**
 * Encrypt a plaintext secret with the DEK
 * Returns encrypted item with IV and authentication tag
 */
export function encryptSecret(plaintext: string, dek: Buffer): EncryptedItem {
  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, dek, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      ct: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
    };
  } catch (error) {
    throw new EncryptionError(
      "ENCRYPTION_FAILED",
      "Failed to encrypt secret",
      error
    );
  }
}

/**
 * Decrypt an encrypted secret with the DEK
 * Returns the plaintext secret
 */
export function decryptSecret(encrypted: EncryptedItem, dek: Buffer): string {
  try {
    const iv = Buffer.from(encrypted.iv, "base64");
    const tag = Buffer.from(encrypted.tag, "base64");
    const ciphertext = Buffer.from(encrypted.ct, "base64");

    const decipher = createDecipheriv(ALGORITHM, dek, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    throw new EncryptionError(
      "DECRYPTION_FAILED",
      "Failed to decrypt secret. The data may be corrupted or the key may be incorrect.",
      error
    );
  }
}

/**
 * Extract last 4 characters from a string for display
 * Used for API key previews (e.g., "****xyz1")
 */
export function getLast4Chars(text: string): string {
  if (!text || text.length < 4) {
    return text || "";
  }
  return text.slice(-4);
}

/**
 * Validate that an encrypted item has all required fields
 */
export function isValidEncryptedItem(item: unknown): item is EncryptedItem {
  if (!item || typeof item !== "object") {
    return false;
  }

  const obj = item as Record<string, unknown>;
  return (
    typeof obj.ct === "string" &&
    typeof obj.iv === "string" &&
    typeof obj.tag === "string" &&
    obj.ct.length > 0 &&
    obj.iv.length > 0 &&
    obj.tag.length > 0
  );
}
