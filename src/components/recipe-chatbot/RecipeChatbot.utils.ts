import type { QuickPrompt, ChatMessage } from "./RecipeChatbot.types";

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: "spicier",
    label: "Make it spicier 🌶️",
    prompt:
      "Please create a spicy variant of this recipe. For example, use chili oil, fresh chilies, chili flakes, or chili paste while keeping the overall flavor balanced. Return the full modified recipe (updated ingredients and step-by-step instructions) and a short list of key changes.",
  },
  {
    id: "vegan",
    label: "Make it vegan 🌱",
    prompt:
      "Please create a vegan variant of this recipe. Replace all animal products with plant-based alternatives (e.g., plant milks, tofu/tempeh, aquafaba for eggs) while preserving flavor and texture. Return the full modified recipe (updated ingredients and step-by-step instructions) and a short list of key changes.",
  },
  {
    id: "gluten-free",
    label: "Make it gluten-free",
    prompt:
      "Please create a gluten-free variant of this recipe. Swap any gluten-containing ingredients for safe alternatives (e.g., rice flour, cornstarch, tamari instead of soy sauce) while keeping structure and taste. Return the full modified recipe (updated ingredients and step-by-step instructions) and a short list of key changes.",
  },
  {
    id: "budget",
    label: "Budget-friendly 💰",
    prompt:
      "Please create a more budget-friendly variant of this recipe. Replace costly items with affordable alternatives (e.g., use seasonal or store-brand options) with minimal loss of quality. Return the full modified recipe (updated ingredients and step-by-step instructions) and a short list of key changes.",
  },
  {
    id: "healthier",
    label: "Healthier version",
    prompt:
      "Please create a healthier variant of this recipe. Reduce calories, fat, or sugar (e.g., baking instead of frying, leaner proteins, reduced sugar) while keeping it tasty. Return the full modified recipe (updated ingredients and step-by-step instructions) and a short list of key changes.",
  },
  {
    id: "quick",
    label: "Faster version ⚡",
    prompt:
      "Please create a faster variant of this recipe. Simplify steps and reduce total time (e.g., fewer prep steps, quick-cook methods) while preserving the spirit of the dish. Return the full modified recipe (updated ingredients and step-by-step instructions) and a short list of key changes.",
  },
];

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createUserMessage(
  content: string,
  variantId?: string
): ChatMessage {
  return {
    id: generateMessageId(),
    role: "user",
    content,
    timestamp: new Date().toISOString(),
    variantId,
  };
}

export function createAssistantMessage(
  content: string,
  variantId?: string
): ChatMessage {
  return {
    id: generateMessageId(),
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
    variantId,
  };
}

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
