import type { InstagramRecipePost } from "@/models/InstagramRecipePost";

export interface RecipeDetailHeaderProps {
  recipe: InstagramRecipePost;
  className?: string;
}

export interface RecipeVariantMeta {
  id: string;
  title: string;
  isOriginal?: boolean;
}
