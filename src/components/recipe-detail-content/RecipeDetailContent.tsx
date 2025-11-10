"use client";

import type { InstagramRecipePost } from "@/models/InstagramRecipePost";
import { RecipeDetailHeader } from "@/components/recipe-detail-header/RecipeDetailHeader";
import { RecipeMetaStrip } from "@/components/recipe-meta-strip/RecipeMetaStrip";
import { IngredientPanel } from "@/components/ingredient-panel/IngredientPanel";
import { StepsPanel } from "@/components/steps-panel/StepsPanel";
import { RecipeMediaInline } from "@/components/recipe-media-inline/RecipeMediaInline";
import { RecipeMediaCard } from "@/components/recipe-media-card/RecipeMediaCard";
import { RecipeMacrosCard } from "@/components/recipe-macros-card/RecipeMacrosCard";
import { RecipeQuickActions } from "@/components/recipe-quick-actions/RecipeQuickActions";
import { RecipeSourceQualityCard } from "@/components/recipe-source-quality-card/RecipeSourceQualityCard";
import { CookModeDialog } from "@/components/cook-mode-dialog/CookModeDialog";
import { RecipeChatbot } from "@/components/recipe-chatbot/RecipeChatbot";
import { useRecipeVariant } from "@/components/recipe-variant-provider/RecipeVariantProvider";

export function RecipeDetailContent({
  recipe,
}: {
  recipe: InstagramRecipePost;
}) {
  const { activeRecipeData } = useRecipeVariant();
  const hasVideo = Boolean(recipe.videoUrl);
  const recipeReady = Boolean(recipe.recipe_data);

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="space-y-6">
          <RecipeDetailHeader recipe={recipe} />
          <RecipeMetaStrip
            recipe={{ ...recipe, recipe_data: activeRecipeData }}
          />
          <IngredientPanel
            recipe={{ ...recipe, recipe_data: activeRecipeData }}
          />
          <StepsPanel recipe={{ ...recipe, recipe_data: activeRecipeData }} />
          {hasVideo && <RecipeMediaInline recipe={recipe} />}
        </section>

        <aside className="space-y-4">
          {hasVideo && (
            <RecipeMediaCard
              recipe={recipe}
              className="sticky top-20 hidden md:block"
            />
          )}
          <RecipeMacrosCard
            recipe={{ ...recipe, recipe_data: activeRecipeData }}
          />
          <RecipeQuickActions recipe={recipe} />
          <RecipeSourceQualityCard recipe={recipe} />
        </aside>
      </div>

      <CookModeDialog recipe={{ ...recipe, recipe_data: activeRecipeData }} />
      {recipeReady && (
        <RecipeChatbot
          recipeId={recipe.id}
          recipeName={activeRecipeData?.title || recipe.caption || "Recipe"}
          activeRecipeData={activeRecipeData}
          originalRecipeData={recipe.recipe_data}
        />
      )}
    </>
  );
}
