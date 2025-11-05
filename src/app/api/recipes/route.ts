import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { InstagramRecipePost } from "@/models/InstagramRecipePost";
import {
  createQueuedRecipeFromUrl,
  extractInstagramShortCode,
} from "@/lib/utils/recipeHelpers";

export async function GET() {
  try {
    const dataDirectory = path.join(process.cwd(), "data");

    const fileNames = await fs.readdir(dataDirectory);
    const jsonFiles = fileNames.filter((file) => file.endsWith(".json"));

    const allRecipes: InstagramRecipePost[] = [];

    for (const file of jsonFiles) {
      const filePath = path.join(dataDirectory, file);
      const fileContents = await fs.readFile(filePath, "utf8");

      try {
        const data = JSON.parse(fileContents);

        if (Array.isArray(data)) {
          // Add default status for existing recipes
          const recipesWithStatus = data.map((recipe: InstagramRecipePost) => ({
            ...recipe,
            status: recipe.status || "ready",
            progress: recipe.progress !== undefined ? recipe.progress : 100,
            createdAt: recipe.createdAt || recipe.timestamp,
          }));
          allRecipes.push(...recipesWithStatus);
        } else if (typeof data === "object" && data !== null) {
          allRecipes.push({
            ...data,
            status: data.status || "ready",
            progress: data.progress !== undefined ? data.progress : 100,
            createdAt: data.createdAt || data.timestamp,
          });
        }
      } catch (parseError) {
        console.error(`Error parsing ${file}:`, parseError);
      }
    }

    return NextResponse.json(allRecipes);
  } catch (error) {
    console.error("Error loading recipes:", error);
    return NextResponse.json(
      { error: "Failed to load recipes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      return NextResponse.json(
        { error: "Missing Instagram URL." },
        { status: 400 }
      );
    }

    const shortCode = extractInstagramShortCode(url);
    if (!shortCode) {
      return NextResponse.json(
        { error: "Invalid Instagram post URL." },
        { status: 400 }
      );
    }

    const queuedRecipe = createQueuedRecipeFromUrl(url);

    return NextResponse.json(queuedRecipe, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
