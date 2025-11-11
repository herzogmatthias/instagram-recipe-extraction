/**
 * POST /api/preferences/modelPreference
 * Saves Gemini model preference
 */

import { NextRequest, NextResponse } from "next/server";
import { setModelPreference } from "@/lib/server/services/firestore/userpreferences";
import type { ModelPreference } from "@/models/UserPreferences";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Audit log: Start
    console.log(
      JSON.stringify({
        action: "MODEL_PREFERENCE_SAVE_START",
        timestamp: new Date().toISOString(),
        actor: "user",
        model: body.geminiDefaultModel,
      })
    );

    if (!body.geminiDefaultModel) {
      return NextResponse.json(
        { error: "Missing required field: geminiDefaultModel" },
        { status: 400 }
      );
    }

    // Basic validation
    if (!body.geminiDefaultModel.startsWith("gemini-")) {
      return NextResponse.json(
        { error: "Model name must start with 'gemini-'" },
        { status: 400 }
      );
    }

    const preference: ModelPreference = {
      geminiDefaultModel: body.geminiDefaultModel,
      lastValidatedAt: new Date().toISOString(),
    };

    await setModelPreference(preference);

    const duration = Date.now() - startTime;

    // Audit log: Success
    console.log(
      JSON.stringify({
        action: "MODEL_PREFERENCE_SAVE_SUCCESS",
        timestamp: new Date().toISOString(),
        actor: "user",
        model: body.geminiDefaultModel,
        durationMs: duration,
      })
    );

    return NextResponse.json(
      {
        success: true,
        modelPreference: preference,
      },
      { status: 200 }
    );
  } catch (error) {
    // Audit log: Failure
    console.error(
      JSON.stringify({
        action: "MODEL_PREFERENCE_SAVE_FAILURE",
        timestamp: new Date().toISOString(),
        actor: "user",
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      })
    );

    return NextResponse.json(
      { error: "Failed to save model preference" },
      { status: 500 }
    );
  }
}
