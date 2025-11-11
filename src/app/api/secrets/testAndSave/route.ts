/**
 * POST /api/secrets/testAndSave
 * Tests and encrypts backend secrets before saving to Firestore
 */

import { NextRequest, NextResponse } from "next/server";
import { setSecrets } from "@/lib/server/services/firestore/userpreferences";
import {
  generateDEK,
  wrapDEK,
  encryptSecret,
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
  try {
    const body: Record<string, TransitEncryptedItem> = await request.json();

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

    // Get master key
    const masterKey = getMasterKey();

    // Generate new DEK for this user
    const dek = generateDEK();
    const wrappedDEK = wrapDEK(dek, masterKey);

    // Encrypt each secret with master key
    const encryptedItems: Record<
      string,
      {
        ct: string;
        iv: string;
        tag: string;
        last4?: string;
        lastValidatedAt?: string;
      }
    > = {};
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
    console.error("Error saving secrets:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save secrets",
      },
      { status: 500 }
    );
  }
}
