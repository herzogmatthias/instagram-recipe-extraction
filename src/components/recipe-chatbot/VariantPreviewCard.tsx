"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VariantPreview } from "./RecipeChatbot.types";
import type { RecipeData } from "@/models/InstagramRecipePost";

interface VariantPreviewCardProps {
  variantPreview: VariantPreview;
  originalRecipeData: RecipeData | null | undefined;
  isLoading: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function VariantPreviewCard({
  variantPreview,
  originalRecipeData,
  isLoading,
  onAccept,
  onReject,
}: VariantPreviewCardProps) {
  return (
    <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h4 className="text-sm font-semibold">
          New Variant Preview: {variantPreview.name}
        </h4>
      </div>

      {/* Changes Summary */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Key Changes:
        </p>
        <div className="space-y-1">
          {variantPreview.changes.map((change, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <span className="text-green-600 mt-0.5">•</span>
              <span>{change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recipe Details Comparison */}
      {originalRecipeData && (
        <div className="space-y-2 text-xs border-t pt-3">
          <div className="grid grid-cols-2 gap-2">
            {variantPreview.recipe_data.servings?.value !==
              originalRecipeData.servings?.value && (
              <div>
                <span className="text-muted-foreground">Servings: </span>
                <span className="line-through text-red-600">
                  {originalRecipeData.servings?.value}
                </span>
                <span className="ml-1 text-green-600 font-medium">
                  {variantPreview.recipe_data.servings?.value}
                </span>
              </div>
            )}
            {variantPreview.recipe_data.prep_time_min !==
              originalRecipeData.prep_time_min && (
              <div>
                <span className="text-muted-foreground">Prep: </span>
                <span className="line-through text-red-600">
                  {originalRecipeData.prep_time_min}m
                </span>
                <span className="ml-1 text-green-600 font-medium">
                  {variantPreview.recipe_data.prep_time_min}m
                </span>
              </div>
            )}
            {variantPreview.recipe_data.cook_time_min !==
              originalRecipeData.cook_time_min && (
              <div>
                <span className="text-muted-foreground">Cook: </span>
                <span className="line-through text-red-600">
                  {originalRecipeData.cook_time_min}m
                </span>
                <span className="ml-1 text-green-600 font-medium">
                  {variantPreview.recipe_data.cook_time_min}m
                </span>
              </div>
            )}
            {variantPreview.recipe_data.difficulty !==
              originalRecipeData.difficulty && (
              <div>
                <span className="text-muted-foreground">Difficulty: </span>
                <span className="line-through text-red-600">
                  {originalRecipeData.difficulty}
                </span>
                <span className="ml-1 text-green-600 font-medium">
                  {variantPreview.recipe_data.difficulty}
                </span>
              </div>
            )}
          </div>
          <div className="text-muted-foreground">
            {variantPreview.recipe_data.ingredients.length} ingredients,{" "}
            {variantPreview.recipe_data.steps.length} steps
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          ✓ Accept Variant
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={isLoading}
          className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
        >
          ✗ Reject
        </Button>
      </div>
    </div>
  );
}
