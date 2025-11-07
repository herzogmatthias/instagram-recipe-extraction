import type { InstagramRecipePost } from "@/models/InstagramRecipePost";
import { formatTime } from "@/lib/shared/utils/recipeHelpers";
import {
  MIN_SERVINGS,
  MAX_SERVINGS,
} from "@/lib/shared/constants/recipeDetail";

type MetaBlock = { label: string; value: string | null | undefined };

export function buildMetaBlocks(recipe: InstagramRecipePost): MetaBlock[] {
  return [
    { label: "Prep", value: formatTime(recipe.recipe_data?.prep_time_min) },
    { label: "Cook", value: formatTime(recipe.recipe_data?.cook_time_min) },
    { label: "Total", value: formatTime(recipe.recipe_data?.total_time_min) },
    { label: "Difficulty", value: titleCase(recipe.recipe_data?.difficulty) },
    { label: "Cuisine", value: recipe.recipe_data?.cuisine },
  ];
}

export function clampServings(value: number): number {
  return Math.min(Math.max(value, MIN_SERVINGS), MAX_SERVINGS);
}

function titleCase(value?: string | null): string | null {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
