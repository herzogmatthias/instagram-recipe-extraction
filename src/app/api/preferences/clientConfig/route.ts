/**
 * POST /api/preferences/clientConfig
 * Saves Firebase Client SDK configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { setClientConfig } from "@/lib/server/services/firestore/userpreferences";
import type { FirebaseClientConfig } from "@/models/UserPreferences";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "apiKey",
      "authDomain",
      "projectId",
      "storageBucket",
      "messagingSenderId",
      "appId",
    ];

    const missing = requiredFields.filter((field) => !body[field]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const config: FirebaseClientConfig = {
      apiKey: body.apiKey,
      authDomain: body.authDomain,
      projectId: body.projectId,
      storageBucket: body.storageBucket,
      messagingSenderId: body.messagingSenderId,
      appId: body.appId,
      measurementId: body.measurementId || undefined,
      lastValidatedAt: new Date().toISOString(),
    };

    await setClientConfig(config);

    return NextResponse.json(
      {
        success: true,
        clientConfig: config,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving client config:", error);
    return NextResponse.json(
      { error: "Failed to save client configuration" },
      { status: 500 }
    );
  }
}
