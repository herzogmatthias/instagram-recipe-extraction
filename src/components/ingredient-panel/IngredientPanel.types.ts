import type { InstagramRecipePost } from "@/models/InstagramRecipePost";
import { DisplayIngredient } from "./IngredientPanel.utils";

export type IngredientPanelProps = {
  recipe: InstagramRecipePost;
};

export type GroupedSection = {
  title: string;
  items: DisplayIngredient[];
};
