import type { Macros } from "@/models/InstagramRecipePost";
import type { ScaledMacros } from "./RecipeMacrosCard.types";

export function scaleMacros(
  macros: Macros | null | undefined,
  servings: number,
  baseServings: number
): ScaledMacros | null {
  if (!macros || !servings || !baseServings) return null;
  const factor = servings / baseServings;
  const calories = Math.round((macros.calories ?? 0) * factor);
  const protein_g = Math.round((macros.protein_g ?? 0) * factor);
  const fat_g = Math.round((macros.fat_g ?? 0) * factor);
  const carbs_g = Math.round((macros.carbs_g ?? 0) * factor);
  if (!calories && !protein_g && !fat_g && !carbs_g) return null;
  return { calories, protein_g, fat_g, carbs_g };
}

export function formatMacrosLine(macros: ScaledMacros | null): string | null {
  if (!macros) return null;
  const { calories, protein_g, fat_g, carbs_g } = macros;
  return `${calories} kcal • P${protein_g}/F${fat_g}/C${carbs_g}`;
}
