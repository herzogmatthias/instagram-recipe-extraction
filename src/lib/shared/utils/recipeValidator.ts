import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { RecipeData } from "@/models/InstagramRecipePost";

/**
 * Flat schema: no nested Servings/Macros objects; fewer unions.
 * If you still hit depth, drop `.describe()` calls (or split schema).
 */

// Keep ingredient/step objects minimal
const IngredientFlat = z.object({
  id: z.string().describe("Stable ingredient identifier."),
  name: z.string().describe("Ingredient name."),
  qty: z
    .string()
    .optional()
    .describe("Quantity; floating point if possible (e.g., '1.5')."),
  unit: z
    .string()
    .optional()
    .describe("Unit, should be standardized (g, tbsp, cup)."),
  prep: z
    .string()
    .optional()
    .describe("Preparation note (e.g., finely chopped)."),
  section: z.string().optional().describe("Logical group (e.g., Sauce)."),
  optional: z.boolean().optional().describe("Ingredient is optional."),
  note: z.string().optional().describe("Chef's note for the ingredient."),
});

const StepFlat = z.object({
  idx: z.number().describe("1-based step index."),
  text: z.string().describe("Instruction text."),
  used_ingredients: z.array(z.string()).describe("IDs of used ingredients."),
  section: z.string().optional().describe("Optional group for this step."),
  est_time_min: z
    .number()
    .optional()
    .describe("Estimated minutes for this step."),
  note: z.string().optional().describe("Chef's note for the step."),
});

// FLAT RecipeData
const RecipeDataFlat = z.object({
  title: z.string().describe("Recipe title."),
  // flattened servings
  servings_value: z.number().optional().describe("Servings yield."),
  servings_note: z.string().optional().describe("Extra serving info."),
  // times
  prep_time_min: z.number().optional().describe("Prep time in minutes."),
  cook_time_min: z.number().optional().describe("Cook time in minutes."),
  total_time_min: z.number().optional().describe("Total time in minutes."),
  // meta
  difficulty: z
    .enum(["easy", "medium", "hard"])
    .describe("Difficulty of the recipe."),
  cuisine: z.string().describe("Cuisine label."),
  // flattened macros (no catchall to keep depth low)
  macros_calories: z.number().optional().describe("kcal per serving."),
  macros_protein_g: z.number().optional().describe("Protein g per serving."),
  macros_carbs_g: z.number().optional().describe("Carbs g per serving."),
  macros_fat_g: z.number().optional().describe("Fat g per serving."),
  // core
  ingredients: z.array(IngredientFlat).min(1).describe("List of ingredients."),
  steps: z.array(StepFlat).min(1).describe("Ordered steps."),
  // misc
  confidence: z.number().optional().describe("Extractor confidence 0..1."),
  assumptions: z.array(z.string()).optional().describe("Assumptions made."),
});

// 1) JSON Schema for Gemini
export function getRecipeResponseSchema(): Record<string, unknown> {
  const root = zodToJsonSchema(RecipeDataFlat, { name: "RecipeData" }) as any;
  // If the converter wrapped it with { $ref: "#/definitions/RecipeData", definitions: {…} }
  // pick the actual definition for Gemini:
  return root?.definitions?.RecipeData ?? root;
}

// 2) Parse & validate a model response into RecipeData (map flat→original type if needed)
export function parseRecipeDataResult(
  input: unknown
): { valid: true; recipe: RecipeData } | { valid: false; issues: string[] } {
  const parsed = RecipeDataFlat.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (e) => `${e.path.join(".") || "<root>"}: ${e.message}`
    );
    return { valid: false, issues };
  }

  // Map flat fields back to your original RecipeData shape
  const data = parsed.data;
  const recipe: RecipeData = {
    title: data.title,
    servings: data.servings_value
      ? { value: data.servings_value, note: data.servings_note }
      : { value: 2, note: "Default serving" }, // Provide default servings if missing
    prep_time_min: data.prep_time_min,
    cook_time_min: data.cook_time_min,
    total_time_min: data.total_time_min,
    difficulty: data.difficulty,
    cuisine: data.cuisine,
    macros_per_serving:
      (data.macros_calories ??
        data.macros_protein_g ??
        data.macros_carbs_g ??
        data.macros_fat_g) !== undefined
        ? {
            calories: data.macros_calories,
            protein_g: data.macros_protein_g,
            carbs_g: data.macros_carbs_g,
            fat_g: data.macros_fat_g,
          }
        : null,
    confidence: data.confidence,
    ingredients: data.ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      quantity: ing.qty ?? null,
      unit: ing.unit ?? null,
      preparation: ing.prep ?? null,
      section: ing.section ?? null,
      optional: ing.optional ?? false,
      chefs_note: ing.note,
    })),
    steps: data.steps.map((st) => ({
      idx: st.idx,
      text: st.text,
      used_ingredients: st.used_ingredients,
      section: st.section ?? null,
      estimated_time_min: st.est_time_min,
      chefs_note: st.note,
    })),
    assumptions: data.assumptions,
  };

  return { valid: true, recipe };
}
