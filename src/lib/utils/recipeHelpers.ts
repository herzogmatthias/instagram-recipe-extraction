import { InstagramRecipePost, Macros } from "@/models/InstagramRecipePost";

/**
 * Extract title from recipe data with fallback to caption
 * Priority: recipe_data.title -> caption
 */
export function extractTitle(recipe: InstagramRecipePost): string {
  if (recipe.recipe_data?.title) {
    return recipe.recipe_data.title;
  }

  if (recipe.caption) {
    const lines = recipe.caption.split("\n");
    const firstLine = lines[0].trim();
    if (firstLine.length > 0 && firstLine.length < 100) {
      return firstLine;
    }
    return recipe.caption.substring(0, 60) + "...";
  }

  return "Untitled Recipe";
}

/**
 * Format time in minutes to human-readable string
 */
export function formatTime(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format difficulty level for display
 */
export function formatDifficulty(difficulty?: string): string | null {
  if (!difficulty) return null;

  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
}

/**
 * Format cuisine for display
 */
export function formatCuisine(cuisine?: string): string | null {
  if (!cuisine) return null;

  return cuisine;
}

/**
 * Format macros as "kcal • P/F/C"
 * Returns null if macros are invalid or all zeros
 */
export function formatMacros(macros?: Macros | null): string | null {
  if (!macros) return null;

  const { calories, protein_g, fat_g, carbs_g } = macros;

  // Don't display if all values are zero or missing
  if (!calories && !protein_g && !fat_g && !carbs_g) {
    return null;
  }

  // Don't display if calories is zero (placeholder data)
  if (calories === 0) {
    return null;
  }

  const cal = calories ? `${calories} kcal` : null;
  const protein = protein_g ? Math.round(protein_g) : 0;
  const fat = fat_g ? Math.round(fat_g) : 0;
  const carbs = carbs_g ? Math.round(carbs_g) : 0;

  // Only show macros breakdown if we have at least one value
  if (protein || fat || carbs) {
    const macrosStr = `${protein}/${fat}/${carbs}`;
    return cal ? `${cal} • ${macrosStr}` : macrosStr;
  }

  return cal;
}

/**
 * Format meta pills for recipe card display
 * Returns array of formatted strings for display
 */
export function formatMetaPills(recipe: InstagramRecipePost): string[] {
  const pills: string[] = [];

  const time = formatTime(recipe.recipe_data?.total_time_min);
  if (time) pills.push(time);

  const difficulty = formatDifficulty(recipe.recipe_data?.difficulty);
  if (difficulty) pills.push(difficulty);

  const cuisine = formatCuisine(recipe.recipe_data?.cuisine);
  if (cuisine) pills.push(cuisine);

  const macros = formatMacros(recipe.recipe_data?.macros_per_serving);
  if (macros) pills.push(macros);

  return pills;
}
