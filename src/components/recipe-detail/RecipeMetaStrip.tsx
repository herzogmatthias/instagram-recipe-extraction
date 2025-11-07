"use client";

import { useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRecipeDetail } from "@/lib/state/recipeDetailStore";
import type { RecipeMetaStripProps } from "./RecipeMetaStrip.types";
import { buildMetaBlocks, clampServings } from "./RecipeMetaStrip.utils";
import {
  MIN_SERVINGS,
  MAX_SERVINGS,
} from "@/lib/shared/constants/recipeDetail";

export function RecipeMetaStrip({ recipe, className }: RecipeMetaStripProps) {
  const { servings, setServings, incrementServings, decrementServings } =
    useRecipeDetail();

  const meta = useMemo(() => buildMetaBlocks(recipe), [recipe]);

  const tags = recipe.recipe_data?.tags?.filter(Boolean) ?? [];

  const handleServingsChange = (value: number) => {
    setServings(clampServings(value));
  };

  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-card px-6 py-5 shadow-sm space-y-5",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
            Servings
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Decrease servings"
              onClick={decrementServings}
            >
              <Minus className="size-4" />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              min={MIN_SERVINGS}
              max={MAX_SERVINGS}
              value={servings}
              onChange={(event) => {
                const parsed = Number(event.currentTarget.value);
                handleServingsChange(
                  Number.isNaN(parsed) ? MIN_SERVINGS : parsed
                );
              }}
              aria-label="Servings"
              className="w-20 text-center text-lg font-semibold"
            />
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Increase servings"
              onClick={incrementServings}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          {recipe.recipe_data?.servings?.note && (
            <p className="mt-1 text-xs text-muted-foreground">
              {recipe.recipe_data.servings.note}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          {meta.map((item) => (
            <MetaItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="rounded-full bg-muted/40 text-xs font-medium text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-[96px]">
      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      <p className="text-base font-medium text-foreground">{value ?? "—"}</p>
    </div>
  );
}
