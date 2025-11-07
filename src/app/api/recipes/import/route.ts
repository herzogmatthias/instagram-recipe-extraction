import { NextRequest, NextResponse } from "next/server";
import type { RecipeStatus } from "@/models/InstagramRecipePost";
import {
  createImport,
  findRecipeByUrl,
  findPendingImportByUrl,
  listImports,
} from "@/lib/server/services/firestore";
import { processRecipeImport } from "@/lib/server/services/orchestration";
import { extractInstagramShortCode } from "@/lib/shared/utils/recipeHelpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const status = searchParams.get("status") || undefined;
    const sortDirection = (searchParams.get("sortDirection") || "desc") as
      | "asc"
      | "desc";
    const cursor = searchParams.get("cursor") || undefined;

    const { imports, nextCursor } = await listImports({
      limit,
      status: status as RecipeStatus | undefined,
      sortDirection,
      cursor,
    });

    return NextResponse.json({ imports, nextCursor }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list imports.";
    console.error("Error listing imports:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Check if recipe already exists
    const existingRecipe = await findRecipeByUrl(url);
    if (existingRecipe) {
      return NextResponse.json(
        {
          error: "This recipe has already been added.",
          recipeId: existingRecipe.id,
        },
        { status: 409 }
      );
    }

    // Check if there's already a pending import for this URL
    const pendingImport = await findPendingImportByUrl(url);
    if (pendingImport) {
      return NextResponse.json(
        {
          error: "This recipe is already being processed.",
          importId: pendingImport.id,
        },
        { status: 409 }
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
