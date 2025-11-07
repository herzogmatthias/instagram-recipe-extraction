"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecipeQuickActionsProps } from "./RecipeQuickActions.types";
import { QUICK_ACTIONS } from "./RecipeQuickActions.utils";

export function RecipeQuickActions({ recipe }: RecipeQuickActionsProps) {
  // Placeholder dispatcher; integrate with chatbot store later.
  const handleAction = (prompt: string) => {
    // In future: dispatch to chatbot context
    console.log("Quick action prompt:", prompt); // eslint-disable-line no-console
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
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="outline"
              size="sm"
              className="justify-start gap-2"
              onClick={() => handleAction(action.prompt)}
              aria-label={action.label}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
