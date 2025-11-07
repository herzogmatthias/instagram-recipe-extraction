import type { InstagramRecipePost } from "@/models/InstagramRecipePost";

export interface VariantSwitcherCardProps {
  recipe: InstagramRecipePost;
}

export interface RecipeVariantMeta {
  id: string;
  title: string;
  isOriginal?: boolean;
}
