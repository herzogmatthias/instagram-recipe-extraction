export type QuickAction = {
  id: string;
  label: string;
  prompt: string; // High-level requirement description only
};

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "spicier",
    label: "Make it spicier",
    prompt:
      "Increase perceived heat using chilies/pastes without overpowering other flavors.",
  },
  {
    id: "vegan",
    label: "Convert to vegan",
    prompt:
      "Replace all animal-derived ingredients with plant-based alternatives preserving flavor & texture.",
  },
  {
    id: "gluten_free",
    label: "Gluten-free variant",
    prompt:
      "Remove gluten sources; substitute with safe alternatives keeping structure & taste.",
  },
  {
    id: "budget",
    label: "Lower cost",
    prompt:
      "Reduce cost by substituting expensive items with cheaper equivalents minimizing quality loss.",
  },
];
