import { NextResponse } from "next/server";
import { createImport } from "@/lib/server/services/firestore";
import { processRecipeImport } from "@/lib/server/services/jobOrchestrator";
import { extractInstagramShortCode } from "@/lib/shared/utils/recipeHelpers";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      return NextResponse.json(
        { error: "Missing Instagram URL." },
        { status: 400 }
      );
    }

    const shortcode = extractInstagramShortCode(url);
    if (!shortcode) {
      return NextResponse.json(
        { error: "Invalid Instagram post URL." },
        { status: 400 }
      );
    }

    const importDoc = await createImport({
      inputUrl: url,
      metadata: {},
    });

    queueMicrotask(() => {
      processRecipeImport(importDoc.id).catch((error) => {
        console.error(
          `[import ${importDoc.id}] Background processing failed:`,
          error
        );
      });
    });

    return NextResponse.json(importDoc, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to queue recipe import.";
    console.error("Error creating recipe import:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
