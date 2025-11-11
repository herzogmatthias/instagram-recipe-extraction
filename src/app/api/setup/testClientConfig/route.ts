/**
 * POST /api/setup/testClientConfig
 * Tests Firebase Client SDK configuration
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Audit log: Start
    console.log(
      JSON.stringify({
        action: "CLIENT_CONFIG_TEST_START",
        timestamp: new Date().toISOString(),
        actor: "user",
        projectId: body.projectId,
      })
    );

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
    const duration = Date.now() - startTime;

    // Audit log: Success
    console.log(
      JSON.stringify({
        action: "CLIENT_CONFIG_TEST_SUCCESS",
        timestamp: new Date().toISOString(),
        actor: "user",
        projectId: body.projectId,
        durationMs: duration,
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: "Firebase configuration is valid",
      },
      { status: 200 }
    );
  } catch (error) {
    // Audit log: Failure
    console.error(
      JSON.stringify({
        action: "CLIENT_CONFIG_TEST_FAILURE",
        timestamp: new Date().toISOString(),
        actor: "user",
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      })
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to test configuration",
      },
      { status: 500 }
    );
  }
}
