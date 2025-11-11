"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRecipeDetail } from "@/lib/client/state/recipeDetailStore";
import type { RecipeMacrosCardProps } from "./RecipeMacrosCard.types";
import { scaleMacros, formatMacrosLine } from "./RecipeMacrosCard.utils";

export function RecipeMacrosCard({ recipe }: RecipeMacrosCardProps) {
  const { servings, baseServings } = useRecipeDetail();
  const macros = scaleMacros(
    recipe.recipe_data?.macros_per_serving ?? null,
    servings,
    baseServings
  );

  if (!macros) return null;

  return (
    <Card className={cn("rounded-2xl border border-border bg-card shadow-sm")}>
      <CardHeader className="pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
          Macros (per total)
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjusted for {servings} serving{servings !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3 text-sm">
          <MacroItem label="Calories" value={`${macros.calories} kcal`} />
          <div className="flex gap-2">
            <MacroPill label="Protein" value={`${macros.protein_g}g`} />
            <MacroPill label="Fat" value={`${macros.fat_g}g`} />
            <MacroPill label="Carbs" value={`${macros.carbs_g}g`} />
          </div>
          <p className="text-xs text-muted-foreground/80">
            {formatMacrosLine(macros)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MacroItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground/70">
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <Badge variant="outline" className="rounded-full bg-muted/30 text-xs">
      {label}: {value}
    </Badge>
  );
}
