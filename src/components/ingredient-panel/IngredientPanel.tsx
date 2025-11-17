"use client";

import { useMemo } from "react";
import { Copy, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
  useRecipeDetail,
  UNIT_SYSTEMS,
  type UnitSystem,
} from "@/lib/client/state/recipeDetailStore";
import { copyTextToClipboard } from "@/lib/client/utils/clipboard";
import { toast } from "sonner";
import type {
  IngredientPanelProps,
  GroupedSection,
} from "./IngredientPanel.types";
import { buildDisplayIngredient } from "./IngredientPanel.utils";
import { addShoppingListItems } from "@/lib/client/services/shoppingList";

export function IngredientPanel({ recipe }: IngredientPanelProps) {
  const {
    unitSystem,
    setUnitSystem,
    servingsMultiplier,
    checkedIngredientIds,
    toggleIngredient,
    highlightIngredients,
  } = useRecipeDetail();

  const sections = useMemo(() => {
    const ingredients = recipe.recipe_data?.ingredients ?? [];
    const sectionMap = new Map<
      string,
      ReturnType<typeof buildDisplayIngredient>[]
    >();

    ingredients.forEach((ingredient) => {
      const sectionName = ingredient.section?.trim() || "Ingredients";
      const items = sectionMap.get(sectionName) ?? [];
      items.push(
        buildDisplayIngredient(ingredient, servingsMultiplier, unitSystem)
      );
      sectionMap.set(sectionName, items);
    });

    return Array.from(sectionMap.entries()).map(([title, items]) => ({
      title,
      items,
    }));
  }, [recipe, servingsMultiplier, unitSystem]);
  const handleCopy = async () => {
    const text = sections
      .map((section) => {
        const header = `# ${section.title}`;
        const body = section.items
          .map((item) => `• ${item.primaryText}`)
          .join("\n");
        return `${header}\n${body}`;
      })
      .join("\n\n");
    await copyTextToClipboard(text, "Ingredients copied.");
  };

  const handleAddToShoppingList = async () => {
    if (sections.length === 0) {
      toast.error("No ingredients available to add.");
      return;
    }

    try {
      const sourceLabel =
        recipe.recipe_data?.title?.trim() ||
        recipe.ownerUsername ||
        "Instagram recipe";
      const items = sections.flatMap((section) =>
        section.items.map((item) => ({
          item: item.ingredient.name,
          quantity: item.quantityText ?? null,
          source: sourceLabel,
          recipeId: recipe.id,
        }))
      );
      await addShoppingListItems(items);
      toast.success("Ingredients added to your shopping list.");
    } catch (error) {
      console.error("[shopping-list] unable to save items", error);
      toast.error("Unable to add ingredients to the shopping list.");
    }
  };

  const renderSection = (section: GroupedSection, key: string) => {
    return (
      <AccordionItem key={key} value={section.title}>
        <AccordionTrigger className="text-left text-base font-semibold text-foreground">
          {section.title}
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            {section.items.map((item) => {
              const isChecked = checkedIngredientIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border border-border/60 bg-card/80 px-3 py-2",
                    isChecked && "opacity-70 line-through decoration-muted"
                  )}
                  onMouseEnter={() => highlightIngredients([item.id])}
                  onMouseLeave={() => highlightIngredients([])}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleIngredient(item.id)}
                    aria-label={`Mark ${item.primaryText} as collected`}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.primaryText}
                    </p>
                    {item.secondaryText && (
                      <p className="text-xs text-muted-foreground">
                        {item.secondaryText}
                      </p>
                    )}
                  </div>
                  {item.chefsNote && (
                    <HoverCard>
                      <HoverCardTrigger className="text-xs text-muted-foreground underline">
                        note
                      </HoverCardTrigger>
                      <HoverCardContent className="max-w-xs text-sm">
                        {item.chefsNote}
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  if (sections.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-3xl border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Ingredients
            </p>
            <h2 className="text-2xl font-heading font-semibold text-foreground">
              Prep your mise en place
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              <Copy className="size-4" />
              Copy list
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddToShoppingList}
              className="gap-1.5"
            >
              <ShoppingBag className="size-4" />
              Shopping list
            </Button>
          </div>
        </div>

        <Tabs
          value={unitSystem}
          onValueChange={(value) => setUnitSystem(value as UnitSystem)}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-xs grid-cols-2 rounded-full bg-muted/60">
            {UNIT_SYSTEMS.map((unit) => (
              <TabsTrigger
                key={unit}
                value={unit}
                className="rounded-full text-sm capitalize"
              >
                {unit === "metric" ? "Metric" : "US"}
              </TabsTrigger>
            ))}
          </TabsList>
          {UNIT_SYSTEMS.map((unit) => (
            <TabsContent key={unit} value={unit} className="sr-only" />
          ))}
        </Tabs>
      </CardHeader>

      <CardContent className="py-6">
        <Accordion type="multiple" defaultValue={sections.map((s) => s.title)}>
          {sections.map((section) => renderSection(section, section.title))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
