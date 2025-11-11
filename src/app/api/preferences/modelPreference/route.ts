/**
 * POST /api/preferences/modelPreference
 * Saves Gemini model preference
 */

import { NextRequest, NextResponse } from "next/server";
import { setModelPreference } from "@/lib/server/services/firestore/userpreferences";
import type { ModelPreference } from "@/models/UserPreferences";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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

    return NextResponse.json(
      {
        success: true,
        modelPreference: preference,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving model preference:", error);
    return NextResponse.json(
      { error: "Failed to save model preference" },
      { status: 500 }
    );
  }
}
