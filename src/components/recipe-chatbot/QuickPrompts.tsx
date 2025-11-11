"use client";

import { Button } from "@/components/ui/button";
import { QUICK_PROMPTS } from "./RecipeChatbot.utils";

interface QuickPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  isLoading: boolean;
}

export function QuickPrompts({ onSelectPrompt, isLoading }: QuickPromptsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Hi! I can help you modify this recipe. Try asking me to:
      </p>
      <div className="grid gap-2">
        {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
          <Button
            key={prompt.id}
            variant="outline"
            size="sm"
            onClick={() => onSelectPrompt(prompt.prompt)}
            className="justify-start text-left text-xs"
            disabled={isLoading}
          >
            {prompt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
