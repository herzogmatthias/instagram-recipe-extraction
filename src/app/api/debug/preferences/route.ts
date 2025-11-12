/**
 * DEBUG /api/debug/preferences
 * Shows raw preferences data for debugging
 * Remove in production
 */

import { NextResponse } from "next/server";
import { getUserPreferences } from "@/lib/server/services/firestore/userpreferences";

export async function GET() {
  try {
    const preferences = await getUserPreferences();

    return NextResponse.json(
      {
        preferences,
        missing: {
          clientConfig: !preferences?.clientConfig,
          secrets: !preferences?.secrets,
          apifyKey: !preferences?.secrets?.items?.APIFY_API_KEY,
          geminiKey: !preferences?.secrets?.items?.GEMINI_API_KEY,
          firebaseAdmin: !preferences?.secrets?.items?.FIREBASE_SA_JSON,
          modelPreference: !preferences?.modelPreference,
        },
        secretKeys: preferences?.secrets?.items
          ? Object.keys(preferences.secrets.items)
          : [],
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
