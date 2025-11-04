import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { InstagramRecipePost } from "@/models/InstagramRecipePost";

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
          allRecipes.push(...data);
        } else if (typeof data === "object" && data !== null) {
          allRecipes.push(data);
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
