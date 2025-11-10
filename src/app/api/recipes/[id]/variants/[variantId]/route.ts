import { NextRequest, NextResponse } from "next/server";
import {
  getVariant,
  deleteVariant,
  updateVariant,
} from "@/lib/server/services/firestore/operations";
import {
  findThread,
  deleteThread,
} from "@/lib/server/services/firestore/threads";

type RouteContext = {
  params: Promise<{ id: string; variantId: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: recipeId, variantId } = await context.params;
    const variant = await getVariant(recipeId, variantId);

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    return NextResponse.json(variant);
  } catch (error) {
    console.error("Get variant error:", error);
    return NextResponse.json(
      { error: "Failed to fetch variant" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: recipeId, variantId } = await context.params;
    const body = await request.json();

    // Update the variant name
    await updateVariant(recipeId, variantId, {
      name: body.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update variant error:", error);
    return NextResponse.json(
      { error: "Failed to update variant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: recipeId, variantId } = await context.params;

    // Find the thread associated with this variant (if it exists)
    // Use findThread instead of getOrCreateThread to avoid creating a thread just to delete it
    const thread = await findThread("variant", variantId);

    // Delete the thread and all its messages if it exists
    if (thread) {
      console.log(`Deleting thread ${thread.id} for variant ${variantId}`);
      await deleteThread(thread.id);
    } else {
      console.log(`No thread found for variant ${variantId}`);
    }

    // Delete the variant
    console.log(`Deleting variant ${variantId} from recipe ${recipeId}`);
    await deleteVariant(recipeId, variantId);
    console.log(`Successfully deleted variant ${variantId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete variant error:", error);
    return NextResponse.json(
      { error: "Failed to delete variant" },
      { status: 500 }
    );
  }
}
