import path from "node:path";
import {
  createGenerator,
  type Config,
  type Schema,
} from "ts-json-schema-generator";
import Ajv, {
  type ErrorObject,
  type JSONSchemaType,
  type ValidateFunction,
} from "ajv";
import type {
  Ingredient,
  RecipeData,
  Step,
} from "@/models/InstagramRecipePost";

export type ValidationSeverity = "error" | "warning";

export interface RecipeValidationIssue {
  path: string;
  message: string;
  severity: ValidationSeverity;
}

export interface RecipeValidationResult {
  valid: boolean;
  issues: RecipeValidationIssue[];
  recipe?: RecipeData;
  confidence?: number;
}

let cachedSchema: Schema | null = null;
let ajvSchemaCache: Schema | null = null;
let responseSchemaCache: Schema | null = null;
let validatorCache: ValidateFunction<RecipeData> | null = null;

const ajv = new Ajv({ allErrors: true, strict: false });

const generatorConfig: Config = {
  path: path.resolve(process.cwd(), "src/models/InstagramRecipePost.ts"),
  tsconfig: path.resolve(process.cwd(), "tsconfig.json"),
  type: "RecipeData",
  topRef: true,
  skipTypeCheck: process.env.NODE_ENV === "production",
};

export function getRecipeSchema(): Schema {
  if (cachedSchema) {
    return cachedSchema;
  }

  const generator = createGenerator(generatorConfig);
  const schema = generator.createSchema(generatorConfig.type) as Schema;
  const definitions = (schema as { definitions?: Record<string, Schema> })
    .definitions;
  const recipeDefinition = (definitions?.RecipeData ?? schema) as Schema;

  enforceArrayMinimums(recipeDefinition, definitions);
  cachedSchema = schema;
  return cachedSchema;
}

function enforceArrayMinimums(
  schema: Schema,
  definitions?: Record<string, Schema>
) {
  if (schema.type !== "object" || !schema.properties) {
    return;
  }

  const ingredientSchema = schema.properties.ingredients as Schema | undefined;
  if (ingredientSchema) {
    (ingredientSchema as any).minItems = 1;
    relaxIngredientRequirements(
      (ingredientSchema as { items?: Schema }).items as Schema | undefined,
      definitions
    );
  }

  const stepsSchema = schema.properties.steps as Schema | undefined;
  if (stepsSchema) {
    (stepsSchema as any).minItems = 1;
  }
}

function relaxIngredientRequirements(
  itemSchema: Schema | undefined,
  definitions?: Record<string, Schema>
) {
  if (!itemSchema || typeof itemSchema !== "object") {
    return;
  }

  const ref = (itemSchema as { $ref?: string }).$ref;
  if (ref && ref.startsWith("#/definitions/")) {
    const key = ref.replace("#/definitions/", "");
    if (definitions?.[key]) {
      relaxIngredientRequirements(definitions[key], definitions);
    }
    return;
  }

  const required = (itemSchema as { required?: string[] }).required;
  if (Array.isArray(required)) {
    (itemSchema as { required?: string[] }).required = required.filter((field) =>
      ["name"].includes(field)
    );
  }
}

export function getRecipeResponseSchema(): Schema {
  if (responseSchemaCache) {
    return responseSchemaCache;
  }

  const recipeSchema = getRecipeSchema();
  const recipeRef =
    recipeSchema.definitions?.RecipeData !== undefined
      ? { $ref: "#/definitions/RecipeData" }
      : recipeSchema;
  responseSchemaCache = {
    type: "object",
    required: ["recipe"],
    additionalProperties: true,
    properties: {
      recipe: recipeRef,
      recipes: {
        type: "array",
        items: recipeRef,
      },
      reasoning: {
        type: "array",
        items: { type: "string" },
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
      },
    },
    definitions: recipeSchema.definitions,
  };

  return responseSchemaCache;
}

function getRecipeAjvSchema(): Schema {
  if (ajvSchemaCache) {
    return ajvSchemaCache;
  }

  const recipeSchema = getRecipeSchema();
  if (recipeSchema.definitions?.RecipeData) {
    ajvSchemaCache = {
      $ref: "#/definitions/RecipeData",
      definitions: recipeSchema.definitions,
    };
  } else {
    ajvSchemaCache = recipeSchema;
  }

  return ajvSchemaCache;
}

function getValidator(): ValidateFunction<RecipeData> {
  if (!validatorCache) {
    // generator Schema isn't exactly AJV's JSONSchemaType, cast safely for compilation
    validatorCache = ajv.compile<RecipeData>(
      getRecipeAjvSchema() as unknown as JSONSchemaType<RecipeData>
    );
  }
  return validatorCache;
}

export function validateRecipeData(input: unknown): RecipeValidationResult {
  const validator = getValidator();
  const schemaValid = validator(input);
  const issues = (validator.errors ?? []).map(formatAjvError);

  if (!schemaValid) {
    return {
      valid: false,
      issues,
    };
  }

  const collectedIssues = [...issues];
  const recipe = normalizeRecipe(input as RecipeData, collectedIssues);
  let isValid = true;

  if (!recipe.title || recipe.title.trim().length === 0) {
    collectedIssues.push({
      path: "title",
      message: "Recipe title is required",
      severity: "error",
    });
    isValid = false;
  }

  const confidence = calculateConfidence(recipe);

  if (collectedIssues.some((issue) => issue.severity === "error")) {
    isValid = false;
  }

  return {
    valid: isValid,
    issues: collectedIssues,
    recipe,
    confidence,
  };
}

function formatAjvError(error: ErrorObject): RecipeValidationIssue {
  return {
    path: error.instancePath || error.schemaPath || "",
    message: error.message ?? "Schema validation error",
    severity: "error",
  };
}

function normalizeRecipe(
  recipe: RecipeData,
  issues: RecipeValidationIssue[]
): RecipeData {
  const normalizedIngredients = recipe.ingredients.map((ingredient, index) =>
    normalizeIngredient(ingredient, index, issues)
  );
  const normalizedSteps = recipe.steps.map((step, index) =>
    normalizeStep(step, index, issues)
  );

  return {
    ...recipe,
    title: recipe.title.trim(),
    tags: normalizeStringArray(recipe.tags),
    assumptions: normalizeStringArray(recipe.assumptions),
    ingredients: normalizedIngredients,
    steps: normalizedSteps,
  };
}

function normalizeIngredient(
  ingredient: Ingredient,
  index: number,
  issues: RecipeValidationIssue[]
): Ingredient {
  if (!ingredient.name || ingredient.name.trim().length === 0) {
    issues.push({
      path: `ingredients[${index}].name`,
      message: "Ingredient name is required",
      severity: "error",
    });
  }

  if (!ingredient.id || ingredient.id.trim().length === 0) {
    ingredient.id = `ingredient_${index + 1}`;
    issues.push({
      path: `ingredients[${index}].id`,
      message: "Missing ingredient id. Generated deterministic value.",
      severity: "warning",
    });
  }

  return {
    ...ingredient,
    id: ingredient.id.trim(),
    name: ingredient.name?.trim() ?? "",
    quantity: ingredient.quantity ?? null,
    unit: ingredient.unit ?? null,
    preparation: ingredient.preparation ?? null,
    section: ingredient.section ?? null,
    optional: Boolean(ingredient.optional),
    chefs_note: ingredient.chefs_note ?? undefined,
  };
}

function normalizeStep(
  step: Step,
  index: number,
  issues: RecipeValidationIssue[]
): Step {
  let idx = step.idx;
  if (typeof idx !== "number" || !Number.isFinite(idx)) {
    idx = index + 1;
    issues.push({
      path: `steps[${index}].idx`,
      message: "Missing idx value. Assigned sequential index.",
      severity: "warning",
    });
  }

  return {
    ...step,
    idx,
    text: step.text.trim(),
    section: step.section ?? null,
    estimated_time_min: step.estimated_time_min ?? undefined,
    chefs_note: step.chefs_note ?? undefined,
    used_ingredients: Array.isArray(step.used_ingredients)
      ? step.used_ingredients
      : [],
  };
}

function normalizeStringArray(value: string[] | undefined) {
  if (!value) {
    return undefined;
  }

  const entries = value
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return entries.length ? entries : undefined;
}

function calculateConfidence(recipe: RecipeData): number {
  const signals = [
    recipe.title ? 1 : 0,
    recipe.ingredients.length > 0 ? 1 : 0,
    recipe.steps.length > 0 ? 1 : 0,
    typeof recipe.total_time_min === "number" ? 1 : 0,
    recipe.difficulty ? 1 : 0,
  ];

  const completenessScore =
    signals.reduce((sum, value) => sum + value, 0) / signals.length;
  const ingredientBonus = Math.min(recipe.ingredients.length / 20, 0.2);
  const stepBonus = Math.min(recipe.steps.length / 30, 0.2);

  return Number(
    Math.min(
      1,
      Math.max(0, completenessScore * 0.6 + ingredientBonus + stepBonus)
    ).toFixed(2)
  );
}
