import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { InstagramRecipePost } from "@/models/InstagramRecipePost";

async function resolveParams(
  params: { id: string } | Promise<{ id: string }>
): Promise<{ id: string }> {
  if (typeof (params as Promise<{ id: string }>).then === "function") {
    return params as Promise<{ id: string }>;
  }
  return params as { id: string };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await resolveParams(params);

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await resolveParams(params);

    if (!id) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    const dataDirectory = path.join(process.cwd(), "data");
    const files = await fs.readdir(dataDirectory);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    for (const file of jsonFiles) {
      const filePath = path.join(dataDirectory, file);
      const fileContent = await fs.readFile(filePath, "utf8");

      try {
        const parsed: unknown = JSON.parse(fileContent);

        if (Array.isArray(parsed)) {
          const typedRecipes = parsed as InstagramRecipePost[];
          const matchIndex = typedRecipes.findIndex(
            (recipe) => recipe.id === id
          );

          if (matchIndex !== -1) {
            typedRecipes.splice(matchIndex, 1);
            await fs.writeFile(
              filePath,
              JSON.stringify(typedRecipes, null, 2)
            );
            return NextResponse.json({ success: true, deletedId: id });
          }
        } else if (
          typeof parsed === "object" &&
          parsed !== null &&
          (parsed as InstagramRecipePost).id === id
        ) {
          await fs.writeFile(filePath, JSON.stringify({}, null, 2));
          return NextResponse.json({ success: true, deletedId: id });
        }
      } catch (error) {
        console.error(`Failed to process ${file}:`, error);
      }
    }

    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
