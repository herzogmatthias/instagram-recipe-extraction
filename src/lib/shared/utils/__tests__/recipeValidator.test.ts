/** @jest-environment node */

import type { RecipeData } from "@/models/InstagramRecipePost";
import { validateRecipeData } from "@/lib/shared/utils/recipeValidator";

const baseRecipe: RecipeData = {
  title: "Test Recipe",
  ingredients: [
    {
      id: "ing-1",
      name: "Flour",
      quantity: "2",
      unit: "cups",
      preparation: null,
      section: null,
      optional: false,
    },
  ],
  steps: [
    {
      idx: 1,
      text: "Mix ingredients.",
      used_ingredients: ["ing-1"],
      section: null,
    },
  ],
};

describe("recipeValidator", () => {
  it("validates correct recipe data", () => {
    const { valid, recipe, confidence, issues } = validateRecipeData(baseRecipe);
    expect(valid).toBe(true);
    expect(recipe?.title).toBe("Test Recipe");
    expect(confidence).toBeGreaterThan(0);
    expect(issues).toHaveLength(0);
  });

  it("flags missing title", () => {
    const invalid = { ...baseRecipe, title: "" };
    const result = validateRecipeData(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.path).toContain("title");
  });

  it("auto-generates ingredient id and warns", () => {
    const invalidIngredient = {
      ...baseRecipe,
      ingredients: [{ ...baseRecipe.ingredients[0], id: undefined }],
    };
    const result = validateRecipeData(invalidIngredient);
    expect(result.valid).toBe(true);
    expect(result.issues.some((issue) => issue.severity === "warning")).toBe(true);
    expect(result.recipe?.ingredients[0]?.id).toMatch(/^ingredient_/);
  });

  it("fails when no steps are provided", () => {
    const invalid = { ...baseRecipe, steps: [] };
    const result = validateRecipeData(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path.includes("steps"))).toBe(true);
  });
});
