/**
 * Server-side transit encryption utilities
 * Decrypts secrets that were encrypted client-side with the transit key
 */

import { createDecipheriv } from "node:crypto";
import { EncryptionError } from "./types";

/**
 * Public transit encryption key (same as client-side)
 * This is NOT the master encryption key - it's only for transit security
 */
const TRANSIT_KEY_HEX =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/**
 * Decrypt a secret that was encrypted client-side
 */
export function decryptTransitSecret(encrypted: {
  ct: string;
  iv: string;
  tag: string;
}): string {
  try {
    const key = Buffer.from(TRANSIT_KEY_HEX, "hex");
    const iv = Buffer.from(encrypted.iv, "base64");
    const tag = Buffer.from(encrypted.tag, "base64");
    const ciphertext = Buffer.from(encrypted.ct, "base64");

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertext, undefined, "utf8");
    plaintext += decipher.final("utf8");

    return plaintext;
  } catch (error) {
    throw new EncryptionError(
      "DECRYPTION_FAILED",
      `Failed to decrypt transit secret: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Decrypt multiple secrets
 */
export function decryptTransitSecrets(
  encrypted: Record<string, { ct: string; iv: string; tag: string }>
): Record<string, string> {
  const decrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(encrypted)) {
    decrypted[key] = decryptTransitSecret(value);
  }

  return decrypted;
}

/**
 * Validate transit encrypted item structure
 */
export function isValidTransitEncrypted(
  item: unknown
): item is { ct: string; iv: string; tag: string } {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const obj = item as Record<string, unknown>;
  return (
    typeof obj.ct === "string" &&
    typeof obj.iv === "string" &&
    typeof obj.tag === "string"
  );
}
