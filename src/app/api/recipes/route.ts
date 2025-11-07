import { NextRequest, NextResponse } from "next/server";
import type { RecipeStatus } from "@/models/InstagramRecipePost";
import { listRecipes } from "@/lib/server/services/firestore/index";

const VALID_STATUSES: RecipeStatus[] = [
  "queued",
  "scraping",
  "downloading_media",
  "uploading_media",
  "extracting",
  "ready",
  "failed",
];

function isValidStatus(value: string | null): value is RecipeStatus {
  return value ? (VALID_STATUSES as string[]).includes(value) : false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get("status");
    const sortParam = searchParams.get("sort");
    const cursor = searchParams.get("cursor") ?? undefined;
    const limitParam = Number(searchParams.get("limit"));

    const { recipes, nextCursor } = await listRecipes({
      status: isValidStatus(statusParam)
        ? (statusParam as RecipeStatus)
        : undefined,
      sortDirection: sortParam === "asc" ? "asc" : "desc",
      cursor,
      limit: Number.isFinite(limitParam) ? limitParam : undefined,
    });

    return NextResponse.json({ items: recipes, nextCursor });
  } catch (error) {
    console.error("Error loading recipes:", error);
    return NextResponse.json(
      { error: "Failed to load recipes" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Use POST /api/recipes/import to queue new recipes." },
    { status: 405 }
  );
}
