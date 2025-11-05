import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { InstagramRecipePost } from "@/models/InstagramRecipePost";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    const dataDirectory = path.join(process.cwd(), "data");

    try {
      await fs.access(dataDirectory);
    } catch {
      return NextResponse.json(
        { error: "Data directory not found" },
        { status: 500 }
      );
    }

    // Try to find the file with this ID
    const files = await fs.readdir(dataDirectory);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    for (const file of jsonFiles) {
      const filePath = path.join(dataDirectory, file);
      const fileContent = await fs.readFile(filePath, "utf8");
      const recipes: InstagramRecipePost[] = JSON.parse(fileContent);

      const recipe = recipes.find((r) => r.id === id);
      if (recipe) {
        // Add default status if not present (for existing data)
        const recipeWithStatus: InstagramRecipePost = {
          ...recipe,
          status: recipe.status || "ready",
          progress: recipe.progress !== undefined ? recipe.progress : 100,
          createdAt: recipe.createdAt || recipe.timestamp,
        };

        return NextResponse.json(recipeWithStatus);
      }
    }

    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
