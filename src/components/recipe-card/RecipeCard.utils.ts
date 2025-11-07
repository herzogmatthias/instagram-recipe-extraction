import {
  InstagramRecipePost,
  Ingredient,
  RecipeData,
  Step,
} from "@/models/InstagramRecipePost";
import { toast } from "sonner";

export function getExportFileName(recipeId: string, title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalized || `recipe-${recipeId}`}.json`;
}

export function formatIngredientsForCopy(ingredients?: Ingredient[]): string {
  if (!ingredients?.length) {
    return "";
  }

  return ingredients
    .map((ingredient) => {
      const quantity =
        ingredient.quantity !== null && ingredient.quantity !== undefined
          ? String(ingredient.quantity)
          : "";
      const unit = ingredient.unit ? ingredient.unit : "";
      const name = ingredient.name || "Ingredient";
      const prep = ingredient.preparation ? ` (${ingredient.preparation})` : "";

      return `• ${[quantity, unit, name]
        .filter(Boolean)
        .join(" ")
        .trim()}${prep}`;
    })
    .join("\n");
}

export function formatStepsForCopy(steps?: Step[]): string {
  if (!steps?.length) {
    return "";
  }

  return steps.map((step, index) => `${index + 1}. ${step.text}`).join("\n\n");
}

export async function copyToClipboard(
  text: string,
  successMessage: string
): Promise<void> {
  if (!text) {
    return;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (typeof document !== "undefined") {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    toast.success(successMessage);
  } catch (error) {
    console.error("Clipboard copy failed", error);
    toast.error("Unable to copy to clipboard.");
  }
}

export function exportRecipeJson(recipe: RecipeData, fileName: string): void {
  try {
    const jsonString = JSON.stringify(recipe, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    toast.success("Recipe JSON downloaded.");
  } catch (error) {
    console.error("Export JSON failed", error);
    toast.error("Failed to export recipe data.");
  }
}

export function deriveCoverUrl(recipe: InstagramRecipePost): string | null {
  if (recipe.displayUrl) {
    return recipe.displayUrl;
  }

  if (recipe.images?.length) {
    const firstValidImage = recipe.images.find(Boolean);
    if (firstValidImage) {
      return firstValidImage;
    }
  }

  if (recipe.recipe_data?.steps?.length) {
    const mediaFromSteps = recipe.recipe_data.steps
      .map((step) => step.chefs_note)
      .find((note) => note && note.startsWith("http"));
    if (mediaFromSteps) {
      return mediaFromSteps;
    }
  }

  return null;
}

export function getFallbackInitial(title: string): string {
  if (!title) {
    return "?";
  }

  const letter = title.trim().charAt(0);
  return letter ? letter.toUpperCase() : "?";
}
