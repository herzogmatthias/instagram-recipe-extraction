"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecipeQuickActionsProps } from "./RecipeQuickActions.types";
import { QUICK_PROMPTS } from "@/components/recipe-chatbot/RecipeChatbot.utils";

export function RecipeQuickActions({ recipe }: RecipeQuickActionsProps) {
  const handleAction = (prompt: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chatbot:prefill", {
          detail: {
            prompt,
            source: "quick-action",
            recipeId: (recipe as any)?.id,
          },
        })
      );
    }
  };

  return (
    <Card className={cn("rounded-2xl border border-border bg-card shadow-sm")}>
      <CardHeader className="pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
          Quick actions
        </p>
        <p className="text-sm text-muted-foreground">Generate smart variants</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-2">
          {QUICK_PROMPTS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="outline"
              size="sm"
              className="justify-start gap-2"
              onClick={() => handleAction(p.prompt)}
              aria-label={p.label}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
