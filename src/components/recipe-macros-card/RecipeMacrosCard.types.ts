import type { InstagramRecipePost, Macros } from "@/models/InstagramRecipePost";

export type RecipeMacrosCardProps = {
  recipe: InstagramRecipePost;
};

export type ScaledMacros = Required<
  Pick<Macros, "calories" | "protein_g" | "fat_g" | "carbs_g">
>;
