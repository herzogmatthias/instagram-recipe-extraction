/**
 * POST /api/secrets/rotate
 * Rotates the DEK by generating a new one and re-encrypting all secrets
 */

import { NextResponse } from "next/server";
import {
  getUserPreferences,
  setSecrets,
} from "@/lib/server/services/firestore/userpreferences";
import {
  generateDEK,
  wrapDEK,
  unwrapDEK,
  encryptSecret,
  decryptSecret,
  getMasterKey,
} from "@/lib/server/services/encryption/crypto";
import type { EncryptedSecrets } from "@/lib/server/services/encryption/types";

export async function POST() {
  const startTime = Date.now();

  try {
    // Audit log: Start
    console.log(
      JSON.stringify({
        action: "KEY_ROTATION_START",
        timestamp: new Date().toISOString(),
        actor: "system",
      })
    );

    // Get current preferences
    const preferences = await getUserPreferences();

    if (!preferences?.secrets) {
      return NextResponse.json(
        { error: "No secrets found to rotate" },
        { status: 404 }
      );
    }

    const currentSecrets = preferences.secrets;

    // Get master key and unwrap current DEK
    const masterKey = getMasterKey();
    const currentDEK = unwrapDEK(currentSecrets.dek_wrapped, masterKey);

    // Decrypt all secrets with current DEK
    const plaintextSecrets: Record<string, string> = {};
    for (const [key, encryptedItem] of Object.entries(currentSecrets.items)) {
      plaintextSecrets[key] = decryptSecret(encryptedItem, currentDEK);
    }

    // Generate new DEK
    const newDEK = generateDEK();
    const newWrappedDEK = wrapDEK(newDEK, masterKey);

    // Re-encrypt all secrets with new DEK
    const reencryptedItems: EncryptedSecrets["items"] = {};
    for (const [key, plaintext] of Object.entries(plaintextSecrets)) {
      const encrypted = encryptSecret(plaintext, newDEK);
      const typedKey = key as keyof EncryptedSecrets["items"];
      reencryptedItems[typedKey] = {
        ...encrypted,
        last4: currentSecrets.items[typedKey]?.last4,
        lastValidatedAt: currentSecrets.items[typedKey]?.lastValidatedAt,
      };
    }

    const rotatedSecrets: EncryptedSecrets = {
      version: 1,
      dek_wrapped: newWrappedDEK,
      items: reencryptedItems,
    };

    // Save to Firestore
    await setSecrets(rotatedSecrets);

    const duration = Date.now() - startTime;

    // Audit log: Success
    console.log(
      JSON.stringify({
        action: "KEY_ROTATION_SUCCESS",
        timestamp: new Date().toISOString(),
        actor: "system",
        secretCount: Object.keys(reencryptedItems).length,
        durationMs: duration,
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: `Successfully rotated ${
          Object.keys(reencryptedItems).length
        } secret(s)`,
        rotatedCount: Object.keys(reencryptedItems).length,
      },
      { status: 200 }
    );
  } catch (error) {
    // Audit log: Failure
    console.error(
      JSON.stringify({
        action: "KEY_ROTATION_FAILURE",
        timestamp: new Date().toISOString(),
        actor: "system",
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      })
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to rotate keys",
      },
      { status: 500 }
    );
  }
}
