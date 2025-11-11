/**
 * GET /api/preferences
 * Retrieves all user preferences (client config, secrets metadata, model preference)
 */

import { NextResponse } from "next/server";
import { getUserPreferences } from "@/lib/server/services/firestore/userpreferences";

export async function GET() {
  try {
    const preferences = await getUserPreferences();

    if (!preferences) {
      return NextResponse.json(
        {
          clientConfig: null,
          secrets: null,
          modelPreference: null,
        },
        { status: 200 }
      );
    }

    // Return preferences (secrets are already encrypted, only metadata exposed)
    return NextResponse.json(preferences, { status: 200 });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}
