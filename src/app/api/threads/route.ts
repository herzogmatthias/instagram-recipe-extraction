import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateThread,
  getMessages,
} from "@/lib/server/services/firestore/threads";

/**
 * GET /api/threads?recipeId=xxx&isOriginal=true|false&variantId=xxx
 * Get or create a thread for a recipe
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get("recipeId");
    const isOriginalParam = searchParams.get("isOriginal");
    const variantId = searchParams.get("variantId");

    if (!recipeId) {
      return NextResponse.json({ error: "Missing recipeId" }, { status: 400 });
    }

    // Determine scope based on isOriginal flag
    // If isOriginal is "false" (string), it's a variant
    // Otherwise (true, null, undefined), it's original
    const scope: "original" | "variant" =
      isOriginalParam === "false" ? "variant" : "original";
    const targetId = scope === "variant" && variantId ? variantId : recipeId;

    // Get or create thread
    const thread = await getOrCreateThread({
      scope,
      targetId,
      rootId: recipeId,
      title: `Recipe Discussion`,
      createdBy: "anonymous", // TODO: Add auth
    });

    // Load messages
    const messages = await getMessages(thread.id);

    return NextResponse.json({
      thread,
      messages,
    });
  } catch (error) {
    console.error("Get thread error:", error);
    return NextResponse.json(
      { error: "Failed to get thread" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/threads
 * Create a new thread for a variant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipeId, variantId, scope } = body;

    if (!recipeId || !variantId || !scope) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the thread
    const thread = await getOrCreateThread({
      scope: scope as "original" | "variant",
      targetId: variantId,
      rootId: recipeId,
      title: `Recipe Discussion`,
      createdBy: "anonymous",
    });

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("Create thread error:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}
