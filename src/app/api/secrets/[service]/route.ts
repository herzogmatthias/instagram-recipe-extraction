/**
 * DELETE /api/secrets/[service]
 * Deletes a specific secret from user preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteSecret } from "@/lib/server/services/firestore/userpreferences";

type RouteContext = {
  params: Promise<{
    service: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();

  try {
    const { service } = await context.params;

    // Validate service name
    const validServices = [
      "APIFY_API_KEY",
      "GEMINI_API_KEY",
      "FIREBASE_SA_JSON",
    ] as const;
    type ValidService = (typeof validServices)[number];

    if (!validServices.includes(service as ValidService)) {
      return NextResponse.json(
        {
          error: `Invalid service name. Must be one of: ${validServices.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Type assertion after validation
    const typedService = service as ValidService;

    // Audit log: Start
    console.log(
      JSON.stringify({
        action: "SECRET_DELETE_START",
        timestamp: new Date().toISOString(),
        actor: "user",
        service: typedService,
      })
    );

    // Delete the secret
    await deleteSecret(typedService);

    const duration = Date.now() - startTime;

    // Audit log: Success
    console.log(
      JSON.stringify({
        action: "SECRET_DELETE_SUCCESS",
        timestamp: new Date().toISOString(),
        actor: "user",
        service: typedService,
        durationMs: duration,
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: `Successfully deleted ${typedService}`,
      },
      { status: 200 }
    );
  } catch (error) {
    const { service } = await context.params;

    // Audit log: Failure
    console.error(
      JSON.stringify({
        action: "SECRET_DELETE_FAILURE",
        timestamp: new Date().toISOString(),
        actor: "user",
        service,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      })
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete secret",
      },
      { status: 500 }
    );
  }
}
