"use client";

import { useMemo } from "react";
import { Timer, Flame } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { useRecipeDetail } from "@/lib/client/state/recipeDetailStore";
import type { StepsPanelProps } from "./StepsPanel.types";
import { buildDisplayIngredient } from "./StepsPanel.utils";

export function StepsPanel({ recipe }: StepsPanelProps) {
  const {
    activeStepIdx,
    setActiveStep,
    highlightIngredients,
    highlightStep,
    setCookMode,
    servingsMultiplier,
    unitSystem,
  } = useRecipeDetail();

  const steps = recipe.recipe_data?.steps ?? [];
  const orderedSteps = useMemo(
    () => [...steps].sort((a, b) => a.idx - b.idx),
    [steps]
  );
  const ingredientsById = useMemo(() => {
    const map = new Map(
      (recipe.recipe_data?.ingredients ?? []).map((ingredient) => [
        ingredient.id,
        buildDisplayIngredient(ingredient, servingsMultiplier, unitSystem),
      ])
    );
    return map;
  }, [recipe, servingsMultiplier, unitSystem]);

  const handleCookMode = () => {
    if (orderedSteps.length > 0) setActiveStep(orderedSteps[0]!.idx);
    setCookMode(true);
  };

  if (steps.length === 0) return null;

  return (
    <Card className="rounded-3xl border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Steps
          </p>
          <h2 className="text-2xl font-heading font-semibold text-foreground">
            Follow the cookthrough
          </h2>
        </div>
        <Button
          type="button"
          size="lg"
          className="gap-2"
          onClick={handleCookMode}
        >
          <Flame className="size-4" />
          Cook mode
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 py-6">
        {orderedSteps.map((step) => {
          const isActive = activeStepIdx === step.idx;
          const usedIngredientIds = step.used_ingredients ?? [];
          return (
            <div
              key={step.idx}
              role="button"
              tabIndex={0}
              data-active={isActive ? "true" : "false"}
              onClick={() => setActiveStep(step.idx)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveStep(step.idx);
                }
              }}
              onMouseEnter={() => highlightStep(step.idx)}
              onMouseLeave={() => highlightStep(null)}
              className={cn(
                "rounded-2xl border border-border/60 bg-card/80 p-4 transition",
                isActive && "border-primary/80 bg-primary/10 shadow-sm"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border text-sm font-semibold",
                    isActive
                      ? "border-primary bg-primary/90 text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {step.idx}
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-base text-foreground">{step.text}</p>
                  {usedIngredientIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {usedIngredientIds.map((id) => {
                        const detail = ingredientsById.get(id);
                        const label = detail?.ingredient.name ?? "Ingredient";
                        return (
                          <HoverCard key={id}>
                            <HoverCardTrigger asChild>
                              <button
                                type="button"
                                className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
                                onMouseEnter={() => highlightIngredients([id])}
                                onMouseLeave={() => highlightIngredients([])}
                              >
                                {label}
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent className="space-y-1 text-sm">
                              <p className="font-medium text-foreground">
                                {detail?.primaryText ?? label}
                              </p>
                              {detail?.secondaryText && (
                                <p className="text-muted-foreground">
                                  {detail.secondaryText}
                                </p>
                              )}
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {step.estimated_time_min && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1">
                        <Timer className="size-3.5" />
                        {step.estimated_time_min} min
                      </span>
                    )}
                    {step.section && (
                      <Badge variant="outline" className="text-xs">
                        {step.section}
                      </Badge>
                    )}
                  </div>
                  {step.chefs_note && (
                    <div className="rounded-2xl border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-sm text-primary-foreground">
                      {step.chefs_note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
