import type { RecipeVariantMeta } from "./RecipeDetailHeader.types";

export function sortVariants(list: RecipeVariantMeta[]): RecipeVariantMeta[] {
  return [...list].sort((a, b) => {
    if (a.isOriginal) return -1;
    if (b.isOriginal) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function formatConfidence(value?: number | null): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value > 1 ? value : value * 100;
  if (Number.isNaN(normalized)) return null;
  return `${Math.round(normalized)}%`;
}

export function formatTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
