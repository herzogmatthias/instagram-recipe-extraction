import { InstagramRecipePost } from "@/models/InstagramRecipePost";

export interface RecipeCardProps {
  recipe: InstagramRecipePost;
  onClick?: () => void;
  className?: string;
  onDeleted?: (recipeId: string) => void;
}

