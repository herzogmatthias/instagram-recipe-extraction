/**
 * Gemini chatbot service for recipe Q&A and variant generation.
 * Handles function calling for createVariant operations.
 */

import { getGeminiClient, getDefaultModel } from "./client";
import {
  Type,
  FunctionDeclaration,
  type Content,
  type FunctionCall,
} from "@google/genai";
import type { Ingredient, RecipeData } from "@/models/InstagramRecipePost";
import type { ChatMessage } from "@/components/recipe-chatbot/RecipeChatbot.types";
import {
  createVariant,
  getRecipeDataForContext,
  updateRecipeIngredientByIndex,
} from "@/lib/server/services/firestore/operations";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 10000;

/**
 * Exponential backoff with jitter
 */
function getRetryDelay(attempt: number): number {
  const delay = Math.min(
    INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt),
    MAX_RETRY_DELAY_MS
  );
  // Add jitter to avoid thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Check if error is retryable (503 or rate limit)
 */
function isRetryableError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const err = error as { status?: number; code?: number; message?: string };
    return (
      err.status === 503 ||
      err.code === 503 ||
      err.status === 429 ||
      err.code === 429 ||
      (err.message?.includes("503") ?? false) ||
      (err.message?.toLowerCase().includes("service unavailable") ?? false) ||
      (err.message?.toLowerCase().includes("rate limit") ?? false)
    );
  }
  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ChatRequest {
  recipeId: string;
  variantId?: string;
  message: string;
  history: ChatMessage[];
  recipeData?: RecipeData;
}

export interface ChatResponse {
  message: string;
  messageId: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  variantPreview?: {
    name: string;
    recipe_data: RecipeData;
    changes: string[];
  };
}

export interface StreamChunk {
  type:
    | "content"
    | "function_call"
    | "function_execution"
    | "variant_preview"
    | "recipe_update"
    | "error"
    | "done";
  content?: string;
  done?: boolean;
  error?: string;
  function_call?: {
    name: string;
    args: Record<string, unknown>;
    result?: Record<string, unknown>;
  };
  variant?: {
    id: string;
    name: string;
    recipe_data: RecipeData;
    changes: string[];
  };
  recipe_update?: {
    recipe_data: RecipeData;
    variantId?: string;
    isOriginal?: boolean;
  };
}

const SYSTEM_INSTRUCTION = `You are a helpful recipe assistant and nutrition expert. You help users understand and modify recipes as well as provide nutritional information and advice on ingredients and cooking techniques.

You have access to the current recipe being viewed. Always refer to this recipe when answering questions.

When a user asks to modify a recipe (make it spicier, vegan, gluten-free, etc.), you should:
1. Analyze the current recipe
2. Use the create_recipe_variant function to generate the complete modified recipe
3. Explain what changes were made

Important:
- Be practical and realistic with suggestions
- Keep cooking techniques authentic
- Consider ingredient availability
- Provide clear explanations
- Always reference the specific recipe details when answering
- When creating variants, provide a complete recipe_data object with ALL fields
- Use descriptive variant names
- When adjusting individual ingredients, first call GetRecipeIngredients to locate the correct ingredient id/index. Then call UpdateRecipeIngredient with a fully specified replacement.`;

// Function declaration for creating recipe variants
const CREATE_VARIANT_FUNCTION: FunctionDeclaration = {
  name: "CreateRecipeVariant",
  description:
    "Creates a new variant of the current recipe with modifications requested by the user. Use this when the user asks to modify the recipe (make it vegan, spicier, gluten-free, etc.)",
  parameters: {
    type: Type.OBJECT,
    properties: {
      variant_name: {
        type: Type.STRING,
        description:
          "A descriptive name for the variant, should include the type of modification",
      },
      recipe_data: {
        type: Type.OBJECT,
        description: "The complete modified recipe data with all fields",
        properties: {
          title: {
            type: Type.STRING,
            description: "Recipe title",
          },
          servings: {
            type: Type.OBJECT,
            description: "Number of servings",
            properties: {
              value: { type: Type.NUMBER },
              note: { type: Type.STRING },
            },
          },
          prep_time_min: {
            type: Type.NUMBER,
            description: "Preparation time in minutes",
          },
          cook_time_min: {
            type: Type.NUMBER,
            description: "Cooking time in minutes",
          },
          total_time_min: {
            type: Type.NUMBER,
            description: "Total time in minutes",
          },
          difficulty: {
            type: Type.STRING,
            description: "Difficulty level (easy, medium, hard)",
          },
          cuisine: {
            type: Type.STRING,
            description: "Type of cuisine",
          },
          ingredients: {
            type: Type.ARRAY,
            description: "List of ingredients",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                preparation: { type: Type.STRING },
                section: { type: Type.STRING },
                optional: { type: Type.BOOLEAN },
                chefs_note: { type: Type.STRING },
              },
              required: ["id", "name"],
            },
          },
          steps: {
            type: Type.ARRAY,
            description: "Cooking steps",
            items: {
              type: Type.OBJECT,
              properties: {
                idx: { type: Type.NUMBER },
                text: { type: Type.STRING },
                used_ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                section: { type: Type.STRING },
                estimated_time_min: { type: Type.NUMBER },
                chefs_note: { type: Type.STRING },
              },
              required: ["idx", "text", "used_ingredients"],
            },
          },
        },
        required: [
          "ingredients",
          "steps",
          "title",
          "servings",
          "difficulty",
          "cuisine",
          "prep_time_min",
          "cook_time_min",
        ],
      },
      changes_summary: {
        type: Type.ARRAY,
        description: "List of key changes made to the recipe",
        items: { type: Type.STRING },
      },
    },
    required: ["variant_name", "recipe_data", "changes_summary"],
  },
};

const GET_INGREDIENTS_FUNCTION: FunctionDeclaration = {
  name: "GetRecipeIngredients",
  description:
    "Returns the id, name, quantity, and unit for every ingredient in the active recipe. Call this before making targeted ingredient edits.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const UPDATE_INGREDIENT_FUNCTION: FunctionDeclaration = {
  name: "UpdateRecipeIngredient",
  description:
    "Updates a specific ingredient (by its zero-based index) with a fully specified new ingredient object.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ingredient_idx: {
        type: Type.NUMBER,
        description: "Zero-based index of the ingredient to replace.",
      },
      ingredient: {
        type: Type.OBJECT,
        description: "Complete ingredient payload to store in Firestore.",
        properties: {
          id: { type: Type.STRING, description: "Unique ingredient id." },
          name: { type: Type.STRING, description: "Display name." },
          quantity: {
            type: Type.STRING,
            description: "Quantity (number or fraction as string).",
          },
          unit: { type: Type.STRING, description: "Unit label." },
          preparation: {
            type: Type.STRING,
            description: "Extra preparation details.",
          },
          section: {
            type: Type.STRING,
            description: "Ingredient section/category.",
          },
          optional: {
            type: Type.BOOLEAN,
            description: "Whether the ingredient is optional.",
          },
          chefs_note: {
            type: Type.STRING,
            description: "Optional chef notes for this ingredient.",
          },
        },
        required: ["id", "name"],
      },
    },
    required: ["ingredient_idx", "ingredient"],
  },
};

const CHAT_FUNCTIONS = [
  CREATE_VARIANT_FUNCTION,
  GET_INGREDIENTS_FUNCTION,
  UPDATE_INGREDIENT_FUNCTION,
];

const MAX_FUNCTION_ITERATIONS = 5;

export async function* streamChatWithRecipe(
  request: ChatRequest
): AsyncGenerator<StreamChunk> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[chatbot] Starting streamChatWithRecipe attempt ${
          attempt + 1
        } for recipe ${request.recipeId}`
      );
      const client = await getGeminiClient();
      const model = await getDefaultModel();
      const systemInstruction = buildSystemInstruction(request);
      const conversation = buildConversationHistory(request);
      let cachedRecipeData = request.recipeData;
      let iterations = 0;

      while (iterations < MAX_FUNCTION_ITERATIONS) {
        console.log(
          `[chatbot] Iteration ${iterations + 1} - sending conversation with ${
            conversation.length
          } turns`
        );
        iterations += 1;

        const result = await client.models.generateContentStream({
          model,
          contents: conversation,
          config: {
            systemInstruction,
            temperature: 0.7,
            tools: [{ functionDeclarations: CHAT_FUNCTIONS }],
          },
        });

        let assistantParts: Content["parts"] | undefined;
        let pendingFunctionCall: FunctionCall | null = null;

        for await (const chunk of result) {
          console.log(
            "[chatbot] Received chunk",
            JSON.stringify(
              {
                hasCandidates: !!chunk.candidates?.length,
                hasFunctionCall: !!chunk.functionCalls?.length,
              },
              null,
              2
            )
          );
          if (chunk.candidates && chunk.candidates.length > 0) {
            const candidate = chunk.candidates[0];
            if (candidate.content && candidate.content.parts) {
              assistantParts = candidate.content.parts;
              for (const part of candidate.content.parts) {
                if (part.text) {
                  yield { type: "content", content: part.text };
                }
              }
            }
          }

          if (
            chunk.functionCalls &&
            chunk.functionCalls.length > 0 &&
            !pendingFunctionCall
          ) {
            pendingFunctionCall = chunk.functionCalls[0];
            yield {
              type: "function_call",
              function_call: {
                name: pendingFunctionCall.name ?? "unknown_function",
                args: pendingFunctionCall.args ?? {},
              },
            };
          }
        }

        conversation.push({
          role: "model",
          parts: assistantParts ?? [{ text: "" }],
        });

        if (!pendingFunctionCall) {
          console.log("[chatbot] No function call requested, finishing.");
          yield { type: "done", done: true };
          return;
        }

        console.log(
          "[chatbot] Executing function call",
          pendingFunctionCall.name,
          pendingFunctionCall.args
        );
        const execution = await executeFunctionCall(pendingFunctionCall, {
          recipeId: request.recipeId,
          variantId: request.variantId,
          cachedRecipeData,
        });

        if (execution.updatedRecipeData) {
          cachedRecipeData = execution.updatedRecipeData;
        }

        if (execution.events) {
          for (const event of execution.events) {
            yield event;
          }
        }

        yield {
          type: "function_execution",
          function_call: {
            name: pendingFunctionCall.name ?? "unknown_function",
            args: pendingFunctionCall.args ?? {},
            result: execution.response,
          },
        };

        conversation.push({
          role: "function",
          parts: [
            {
              functionResponse: {
                name: pendingFunctionCall.name,
                response: execution.response,
              },
            },
          ],
        });
      }

      throw new Error(
        "Exceeded maximum function iterations without a final response."
      );
    } catch (error) {
      lastError = error;
      console.error(
        `[chatbot] streamChatWithRecipe attempt ${attempt + 1} failed`,
        error
      );
      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        break;
      }

      const delay = getRetryDelay(attempt);
      await sleep(delay);
    }
  }

  throw lastError;
}

type ToolExecutionContext = {
  recipeId: string;
  variantId?: string;
  cachedRecipeData?: RecipeData;
};

type FunctionExecutionResult = {
  response: Record<string, unknown>;
  events?: StreamChunk[];
  updatedRecipeData?: RecipeData | null;
};

type IngredientSummary = {
  idx: number;
  id: string;
  name: string;
  quantity: Ingredient["quantity"];
  unit: Ingredient["unit"];
};

function buildConversationHistory(request: ChatRequest): Content[] {
  const history = request.history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  return [
    ...history,
    {
      role: "user",
      parts: [{ text: request.message }],
    },
  ];
}

function buildSystemInstruction(request: ChatRequest): string {
  if (!request.recipeData) {
    return SYSTEM_INSTRUCTION;
  }

  const recipe = request.recipeData;
  const ingredientLines = recipe.ingredients
    .map(
      (ing) =>
        `- ${ing.quantity || ""} ${ing.unit || ""} ${ing.name}${
          ing.preparation ? ` (${ing.preparation})` : ""
        }`
    )
    .join("\n");

  const stepLines = recipe.steps
    .map((step) => `${step.idx + 1}. ${step.text}`)
    .join("\n");

  return `${SYSTEM_INSTRUCTION}

CURRENT RECIPE YOU ARE HELPING WITH:
Title: ${recipe.title}
Servings: ${recipe.servings?.value || "Not specified"}
Difficulty: ${recipe.difficulty || "Not specified"}
Cuisine: ${recipe.cuisine || "Not specified"}

Ingredients:
${ingredientLines}

Steps:
${stepLines}

Always reference this specific recipe when answering questions.`;
}

async function executeFunctionCall(
  functionCall: FunctionCall,
  context: ToolExecutionContext
): Promise<FunctionExecutionResult> {
  const name = functionCall.name ?? "unknown_function";
  console.log("[chatbot] executeFunctionCall", name, functionCall.args);
  try {
    if (name === CREATE_VARIANT_FUNCTION.name) {
      const args = functionCall.args as {
        variant_name?: string;
        recipe_data?: RecipeData;
        changes_summary?: string[];
      };

      if (!args?.variant_name || !args?.recipe_data) {
        throw new Error("variant_name and recipe_data are required.");
      }

      const changes = Array.isArray(args.changes_summary)
        ? args.changes_summary.map((entry) => String(entry))
        : [];

      const newVariant = await createVariant({
        recipeId: context.recipeId,
        name: args.variant_name,
        recipe_data: args.recipe_data,
        isOriginal: false,
      });

      return {
        response: {
          success: true,
          variantId: newVariant.id,
          variantName: args.variant_name,
        },
        events: [
          {
            type: "variant_preview",
            variant: {
              id: newVariant.id,
              name: args.variant_name,
              recipe_data: args.recipe_data,
              changes,
            },
          },
        ],
      };
    }

    if (name === GET_INGREDIENTS_FUNCTION.name) {
      const { summaries, recipeData } = await getIngredientSummaries(context);
      return {
        response: {
          success: true,
          ingredients: summaries,
        },
        updatedRecipeData: recipeData,
      };
    }

    if (name === UPDATE_INGREDIENT_FUNCTION.name) {
      const idxValue =
        functionCall.args?.ingredient_idx ?? functionCall.args?.idx;
      const ingredientIdx = Number(idxValue);

      if (!Number.isFinite(ingredientIdx)) {
        throw new Error("ingredient_idx must be a valid number.");
      }

      const ingredientPayload = normalizeIngredientInput(
        functionCall.args?.ingredient
      );

      const updatedRecipeData = await updateRecipeIngredientByIndex({
        recipeId: context.recipeId,
        variantId: context.variantId,
        ingredientIndex: ingredientIdx,
        ingredient: ingredientPayload,
      });

      return {
        response: {
          success: true,
          ingredient_idx: ingredientIdx,
          ingredient: ingredientPayload,
        },
        updatedRecipeData,
        events: [
          {
            type: "recipe_update",
            recipe_update: {
              recipe_data: updatedRecipeData,
              variantId: context.variantId ?? context.recipeId,
              isOriginal: !context.variantId,
            },
          },
        ],
      };
    }

    return {
      response: {
        success: false,
        error: `Unknown function ${name}`,
      },
      events: [
        {
          type: "error",
          error: `Unknown function ${name}`,
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Function execution failed.";
    return {
      response: {
        success: false,
        error: message,
      },
      events: [
        {
          type: "error",
          error: message,
        },
      ],
    };
  }
}

async function getIngredientSummaries(
  context: ToolExecutionContext
): Promise<{ summaries: IngredientSummary[]; recipeData: RecipeData | null }> {
  console.log(
    "[chatbot] Fetching ingredient summaries for",
    context.recipeId,
    context.variantId ?? "original"
  );
  const recipeData =
    (await getRecipeDataForContext(context.recipeId, context.variantId)) ??
    context.cachedRecipeData ??
    null;

  if (!recipeData) {
    throw new Error("Recipe data is unavailable.");
  }

  const summaries: IngredientSummary[] =
    recipeData.ingredients?.map((ingredient, idx) => ({
      idx,
      id: ingredient.id,
      name: ingredient.name,
      quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null,
    })) ?? [];

  console.log("[chatbot] Found ingredient summaries", summaries.length);

  return { summaries, recipeData };
}

function normalizeIngredientInput(input: unknown): Ingredient {
  if (!input || typeof input !== "object") {
    throw new Error("ingredient payload must be an object.");
  }

  const candidate = input as Record<string, unknown>;
  const id = candidate.id;
  const name = candidate.name;

  if (typeof id !== "string" || typeof name !== "string") {
    throw new Error("ingredient.id and ingredient.name must be strings.");
  }

  const quantityValue = candidate.quantity;
  let quantity: Ingredient["quantity"] = null;
  if (typeof quantityValue === "number" || typeof quantityValue === "string") {
    quantity = quantityValue;
  }

  const optional =
    typeof candidate.optional === "boolean"
      ? candidate.optional
      : candidate.optional ?? undefined;

  const unit = normalizeOptionalString(candidate.unit);
  const preparation = normalizeOptionalString(candidate.preparation);
  const section = normalizeOptionalString(candidate.section);
  const chefsNote = normalizeOptionalString(candidate.chefs_note);

  return {
    id,
    name,
    quantity,
    unit,
    preparation,
    section,
    optional,
    chefs_note: chefsNote ?? undefined,
  };
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}
