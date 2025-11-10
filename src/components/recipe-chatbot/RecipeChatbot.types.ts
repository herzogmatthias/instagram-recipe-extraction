import type { RecipeData } from "@/models/InstagramRecipePost";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
  variantId?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
};

export type ChatThread = {
  id: string;
  recipeId: string;
  variantId?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type QuickPrompt = {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
};

export type VariantPreview = {
  variantId: string;
  name: string;
  recipe_data: RecipeData;
  changes: string[];
};

export type RecipeChatbotProps = {
  recipeId: string;
  recipeName: string;
  activeRecipeData?: RecipeData;
  originalRecipeData?: RecipeData;
  className?: string;
};
