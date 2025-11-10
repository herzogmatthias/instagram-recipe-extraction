"use client";

import { useState, useEffect, createContext, useContext } from "react";
import type {
  InstagramRecipePost,
  RecipeData,
} from "@/models/InstagramRecipePost";

export type RecipeVariantContextValue = {
  activeVariantId: string;
  activeRecipeData: RecipeData | undefined;
  isOriginal: boolean;
};

const RecipeVariantContext = createContext<RecipeVariantContextValue | null>(
  null
);

export function RecipeVariantProvider({
  recipe,
  children,
}: {
  recipe: InstagramRecipePost;
  children: React.ReactNode;
}) {
  const [activeVariantId, setActiveVariantId] = useState(recipe.id);
  const [activeRecipeData, setActiveRecipeData] = useState(recipe.recipe_data);
  const [isOriginal, setIsOriginal] = useState(true);

  useEffect(() => {
    const handleVariantChanged = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        variantId: string;
        isOriginal: boolean;
      }>;

      const { variantId, isOriginal: varIsOriginal } = customEvent.detail;

      setActiveVariantId(variantId);
      setIsOriginal(varIsOriginal);

      if (varIsOriginal) {
        // Switch back to original
        setActiveRecipeData(recipe.recipe_data);
      } else {
        // Fetch variant data
        try {
          const response = await fetch(
            `/api/recipes/${recipe.id}/variants/${variantId}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch variant");
          }

          const variantData = await response.json();
          setActiveRecipeData(variantData.recipe_data);
        } catch (error) {
          console.error("Failed to load variant:", error);
        }
      }
    };

    window.addEventListener("variantChanged", handleVariantChanged);
    return () => {
      window.removeEventListener("variantChanged", handleVariantChanged);
    };
  }, [recipe.id, recipe.recipe_data]);

  return (
    <RecipeVariantContext.Provider
      value={{ activeVariantId, activeRecipeData, isOriginal }}
    >
      {children}
    </RecipeVariantContext.Provider>
  );
}

export function useRecipeVariant() {
  const context = useContext(RecipeVariantContext);
  if (!context) {
    throw new Error(
      "useRecipeVariant must be used within RecipeVariantProvider"
    );
  }
  return context;
}
