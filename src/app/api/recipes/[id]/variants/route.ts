import { NextRequest, NextResponse } from "next/server";
import { createVariant, listVariants } from "@/lib/server/services/firestore";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const variants = await listVariants(id);
    return NextResponse.json({ variants });
  } catch (error) {
    console.error("List variants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch variants" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: recipeId } = await context.params;
    const body = await request.json();
    const { name, recipe_data } = body;

    if (!name || !recipe_data) {
      return NextResponse.json(
        { error: "Missing name or recipe_data" },
        { status: 400 }
      );
    }

    // Validate recipe_data has required fields
    if (!recipe_data.title || !recipe_data.ingredients || !recipe_data.steps) {
      return NextResponse.json(
        { error: "Invalid recipe_data: missing title, ingredients, or steps" },
        { status: 400 }
      );
    }

    const variant = await createVariant({
      recipeId,
      name,
      recipe_data: { ...recipe_data, isOriginal: false },
      isOriginal: false,
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    console.error("Create variant error:", error);
    return NextResponse.json(
      { error: "Failed to create variant" },
      { status: 500 }
    );
  }
}
