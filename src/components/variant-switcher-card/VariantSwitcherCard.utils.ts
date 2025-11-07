import type { RecipeVariantMeta } from "./VariantSwitcherCard.types";

export function sortVariants(list: RecipeVariantMeta[]): RecipeVariantMeta[] {
  return [...list].sort((a, b) => {
    if (a.isOriginal) return -1;
    if (b.isOriginal) return 1;
    return a.title.localeCompare(b.title);
  });
}
