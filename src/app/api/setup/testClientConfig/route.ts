/**
 * POST /api/setup/testClientConfig
 * Tests Firebase Client SDK configuration
 */

import { NextRequest, NextResponse } from "next/server";

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
        {
          success: false,
          error: `Missing required fields: ${missing.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Basic validation of field formats
    if (!body.apiKey.startsWith("AIza")) {
      return NextResponse.json(
        {
          success: false,
          error: "API key should start with 'AIza'",
        },
        { status: 400 }
      );
    }

    if (!body.authDomain.includes(".firebaseapp.com")) {
      return NextResponse.json(
        {
          success: false,
          error: "Auth domain should end with '.firebaseapp.com'",
        },
        { status: 400 }
      );
    }

    // If all validations pass
    return NextResponse.json(
      {
        success: true,
        message: "Firebase configuration is valid",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error testing client config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test configuration",
      },
      { status: 500 }
    );
  }
}
