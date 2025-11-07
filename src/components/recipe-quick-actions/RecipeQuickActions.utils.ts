export type QuickAction = {
  id: string;
  label: string;
  prompt: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "spicier",
    label: "Make it spicier",
    prompt:
      "Suggest spicy adjustments (chilies, oils, pastes) keeping balance.",
  },
  {
    id: "vegan",
    label: "Convert to vegan",
    prompt:
      "Replace animal products with vegan alternatives maintaining flavor and texture.",
  },
  {
    id: "gluten_free",
    label: "Gluten-free variant",
    prompt:
      "Adjust ingredients to remove gluten while preserving structure and taste.",
  },
  {
    id: "budget",
    label: "Lower cost",
    prompt:
      "Swap expensive ingredients for budget-friendly alternatives with minimal quality loss.",
  },
];
