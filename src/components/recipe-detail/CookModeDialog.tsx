"use client";

import { useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRecipeDetail } from "@/lib/state/recipeDetailStore";
import type { InstagramRecipePost } from "@/models/InstagramRecipePost";
import { buildDisplayIngredient } from "./ingredientUtils";

type CookModeDialogProps = {
  recipe: InstagramRecipePost;
};

export function CookModeDialog({ recipe }: CookModeDialogProps) {
  const {
    cookMode,
    setCookMode,
    activeStepIdx,
    setActiveStep,
    highlightIngredients,
    servingsMultiplier,
    unitSystem,
  } = useRecipeDetail();

  const steps = recipe.recipe_data?.steps ?? [];
  const ingredientDetails = useMemo(() => {
    const ingredients = recipe.recipe_data?.ingredients ?? [];
    return new Map(
      ingredients.map((ingredient) => [
        ingredient.id,
        buildDisplayIngredient(ingredient, servingsMultiplier, unitSystem),
      ])
    );
  }, [recipe, servingsMultiplier, unitSystem]);
  const orderedSteps = useMemo(
    () => [...steps].sort((a, b) => a.idx - b.idx),
    [steps]
  );

  useEffect(() => {
    if (cookMode && !activeStepIdx && orderedSteps.length > 0) {
      setActiveStep(orderedSteps[0]!.idx);
    }
  }, [cookMode, activeStepIdx, orderedSteps, setActiveStep]);

  const currentIndex = Math.max(
    orderedSteps.findIndex((step) => step.idx === activeStepIdx),
    0
  );
  const currentStep = orderedSteps[currentIndex];

  useEffect(() => {
    if (cookMode && currentStep) {
      highlightIngredients(currentStep.used_ingredients ?? []);
      return () => highlightIngredients([]);
    }
    return undefined;
  }, [cookMode, currentStep, highlightIngredients]);

  const goToNext = () => {
    if (currentIndex < orderedSteps.length - 1) {
      setActiveStep(orderedSteps[currentIndex + 1]!.idx);
    } else {
      setCookMode(false);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setActiveStep(orderedSteps[currentIndex - 1]!.idx);
    }
  };

  return (
    <Dialog open={cookMode} onOpenChange={setCookMode}>
      <DialogContent
        className={cn(
          "h-[100svh] w-screen max-w-none border-none bg-card text-foreground p-0 shadow-2xl sm:h-auto sm:max-w-6xl sm:rounded-[36px]",
          "overflow-hidden"
        )}
        showCloseButton={false}
      >
        <div className="flex h-full flex-col gap-8 overflow-y-auto p-6 sm:p-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Cook mode
              </DialogTitle>
              <p className="text-3xl font-heading font-semibold text-foreground">
                Step {currentIndex + 1} of {orderedSteps.length}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCookMode(false)}
              aria-label="Close cook mode"
            >
              <X className="size-5" />
            </Button>
          </div>

          {currentStep ? (
            <div className="flex flex-col gap-6 p-6 text-left text-lg leading-relaxed">
              <p className="text-balance text-2xl font-medium">
                {currentStep.text}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {currentStep.estimated_time_min && (
                  <Badge variant="outline" className="gap-2 text-base">
                    ⏱ {currentStep.estimated_time_min} min
                  </Badge>
                )}
                {currentStep.section && (
                  <Badge variant="secondary">{currentStep.section}</Badge>
                )}
              </div>

              {currentStep.used_ingredients && currentStep.used_ingredients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentStep.used_ingredients.map((id) => {
                    const detail = ingredientDetails.get(id);
                    if (!detail) return null;
                    return (
                      <Badge
                        key={id}
                        variant="outline"
                        className="rounded-full border border-border/60 px-3 py-1 text-sm font-medium"
                      >
                        {detail.primaryText}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {currentStep.chefs_note && (
                <div className="rounded-3xl border border-primary/40 bg-primary/10 p-4 text-base text-primary-foreground">
                  {currentStep.chefs_note}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-lg text-muted-foreground">
              No steps available.
            </p>
          )}

          <div className="mt-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-4 rounded-3xl border border-border/60 bg-muted/50 p-4 text-sm text-muted-foreground">
              <div
                className={cn(
                  "inline-flex size-12 items-center justify-center rounded-2xl border text-lg font-semibold",
                  "border-border bg-card text-foreground"
                )}
              >
                {orderedSteps[currentIndex + 1]?.idx ?? "✓"}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Up next
                </p>
                <p className="text-base text-foreground">
                  {orderedSteps[currentIndex + 1]?.text ??
                    "You are on the final step"}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="gap-2"
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={goToNext}
                className="gap-2"
              >
                {currentIndex === orderedSteps.length - 1 ? "Finish" : "Next"}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
