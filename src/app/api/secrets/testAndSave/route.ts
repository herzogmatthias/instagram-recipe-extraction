/**
 * POST /api/secrets/testAndSave
 * Tests and encrypts backend secrets before saving to Firestore
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getUserPreferences,
  setSecrets,
} from "@/lib/server/services/firestore/userpreferences";
import {
  generateDEK,
  wrapDEK,
  encryptSecret,
  unwrapDEK,
  getMasterKey,
  getLast4Chars,
} from "@/lib/server/services/encryption/crypto";
import { decryptTransitSecret } from "@/lib/server/services/encryption/transit";
import type { EncryptedSecrets } from "@/lib/server/services/encryption/types";

type TransitEncryptedItem = {
  ct: string;
  iv: string;
  tag: string;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: Record<string, TransitEncryptedItem> = await request.json();

    // Audit log: Start
    console.log(
      JSON.stringify({
        action: "SECRETS_SAVE_START",
        timestamp: new Date().toISOString(),
        actor: "user",
        secretCount: Object.keys(body).length,
      })
    );

    // Validate at least one secret is provided
    const secretKeys = Object.keys(body);
    if (secretKeys.length === 0) {
      return NextResponse.json(
        { error: "No secrets provided" },
        { status: 400 }
      );
    }

    // Decrypt transit-encrypted secrets
    const plaintextSecrets: Record<string, string> = {};
    for (const [key, encryptedValue] of Object.entries(body)) {
      plaintextSecrets[key] = decryptTransitSecret(encryptedValue);
    }

    // Get existing secrets to merge with
    const preferences = await getUserPreferences();
    const existingSecrets = preferences?.secrets;

    // Get master key
    const masterKey = getMasterKey();

    // Use existing DEK or generate new one
    let dek: Buffer;
    let wrappedDEK: string;

    if (existingSecrets?.dek_wrapped) {
      // Decrypt existing secrets to preserve them
      dek = unwrapDEK(existingSecrets.dek_wrapped, masterKey);
      wrappedDEK = existingSecrets.dek_wrapped;
    } else {
      // Generate new DEK for first-time setup
      dek = generateDEK();
      wrappedDEK = wrapDEK(dek, masterKey);
    }

    // Start with existing items or empty object
    const encryptedItems: Record<
      string,
      {
        ct: string;
        iv: string;
        tag: string;
        last4?: string;
        lastValidatedAt?: string;
      }
    > = existingSecrets?.items ? { ...existingSecrets.items } : {};

    // Encrypt and merge new secrets
    for (const [key, value] of Object.entries(plaintextSecrets)) {
      if (value && value.trim().length > 0) {
        const encrypted = encryptSecret(value, dek);
        encryptedItems[key] = {
          ...encrypted,
          last4: getLast4Chars(value),
          lastValidatedAt: new Date().toISOString(),
        };
      }
    }

    const encryptedSecrets: EncryptedSecrets = {
      version: 1,
      dek_wrapped: wrappedDEK,
      items: encryptedItems,
    };

    // Save to Firestore
    await setSecrets(encryptedSecrets);

    const duration = Date.now() - startTime;

    // Audit log: Success
    console.log(
      JSON.stringify({
        action: "SECRETS_SAVE_SUCCESS",
        timestamp: new Date().toISOString(),
        actor: "user",
        secretCount: Object.keys(encryptedItems).length,
        durationMs: duration,
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: `Successfully saved ${
          Object.keys(encryptedItems).length
        } secret(s)`,
      },
      { status: 200 }
    );
  } catch (error) {
    // Audit log: Failure
    console.error(
      JSON.stringify({
        action: "SECRETS_SAVE_FAILURE",
        timestamp: new Date().toISOString(),
        actor: "user",
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      })
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save secrets",
      },
      { status: 500 }
    );
  }
}
