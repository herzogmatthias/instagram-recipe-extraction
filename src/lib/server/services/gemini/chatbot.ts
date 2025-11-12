/**
 * Gemini chatbot service for recipe Q&A and variant generation.
 * Handles function calling for createVariant operations.
 */

import { getGeminiClient, getDefaultModel } from "./client";
import { Type, FunctionDeclaration } from "@google/genai";
import type { RecipeData } from "@/models/InstagramRecipePost";
import type { ChatMessage } from "@/components/recipe-chatbot/RecipeChatbot.types";

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
  type: "content" | "function_call" | "done";
  content?: string;
  done?: boolean;
  function_call?: {
    name: string;
    args: Record<string, unknown>;
  };
}

const SYSTEM_INSTRUCTION = `You are a helpful recipe assistant. You help users understand and modify recipes.

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
- Use descriptive variant names like "Vegan Version", "Spicy Variation", "Gluten-Free Adaptation"`;

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

export async function chatWithRecipe(
  request: ChatRequest
): Promise<ChatResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const client = await getGeminiClient();
      const model = await getDefaultModel();

      // Build dynamic system instruction with recipe context
      const systemInstruction = request.recipeData
        ? `${SYSTEM_INSTRUCTION}

CURRENT RECIPE YOU ARE HELPING WITH:
Title: ${request.recipeData.title}
Servings: ${request.recipeData.servings?.value || "Not specified"}
Difficulty: ${request.recipeData.difficulty || "Not specified"}
Cuisine: ${request.recipeData.cuisine || "Not specified"}

Ingredients:
${request.recipeData.ingredients
  .map(
    (ing) =>
      `- ${ing.quantity || ""} ${ing.unit || ""} ${ing.name}${
        ing.preparation ? ` (${ing.preparation})` : ""
      }`
  )
  .join("\n")}

Steps:
${request.recipeData.steps
  .map((step) => `${step.idx + 1}. ${step.text}`)
  .join("\n")}

Always reference this specific recipe when answering questions.`
        : SYSTEM_INSTRUCTION;

      // Convert history to Gemini format
      const history = request.history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      // Add user message to history
      const contents = [
        ...history,
        {
          role: "user" as const,
          parts: [{ text: request.message }],
        },
      ];

      const result = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      // Get text response
      const text =
        result.text?.trim() || "I'm sorry, I couldn't generate a response.";

      return {
        message: text,
        messageId: `msg_${Date.now()}`,
      };
    } catch (error) {
      lastError = error;
      console.error(`Chat attempt ${attempt + 1} failed:`, error);

      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        break;
      }

      const delay = getRetryDelay(attempt);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // If all retries failed, throw the last error
  throw lastError;
}

export async function* streamChatWithRecipe(
  request: ChatRequest
): AsyncGenerator<StreamChunk> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const client = await getGeminiClient();
      const model = await getDefaultModel();

      // Build dynamic system instruction with recipe context
      const systemInstruction = request.recipeData
        ? `${SYSTEM_INSTRUCTION}

CURRENT RECIPE YOU ARE HELPING WITH:
Title: ${request.recipeData.title}
Servings: ${request.recipeData.servings?.value || "Not specified"}
Difficulty: ${request.recipeData.difficulty || "Not specified"}
Cuisine: ${request.recipeData.cuisine || "Not specified"}

Ingredients:
${request.recipeData.ingredients
  .map(
    (ing) =>
      `- ${ing.quantity || ""} ${ing.unit || ""} ${ing.name}${
        ing.preparation ? ` (${ing.preparation})` : ""
      }`
  )
  .join("\n")}

Steps:
${request.recipeData.steps
  .map((step) => `${step.idx + 1}. ${step.text}`)
  .join("\n")}

Always reference this specific recipe when answering questions.`
        : SYSTEM_INSTRUCTION;

      // Convert history to Gemini format
      const history = request.history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      // Add user message to history
      const contents = [
        ...history,
        {
          role: "user" as const,
          parts: [{ text: request.message }],
        },
      ];

      // Log function declaration being sent
      console.log("Registering function with Gemini:", {
        name: CREATE_VARIANT_FUNCTION.name,
        hasParams: !!CREATE_VARIANT_FUNCTION.parameters,
        topLevelProps: CREATE_VARIANT_FUNCTION.parameters?.properties
          ? Object.keys(CREATE_VARIANT_FUNCTION.parameters.properties)
          : [],
      });

      const result = await client.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: [{ functionDeclarations: [CREATE_VARIANT_FUNCTION] }],
        },
      });

      // Stream chunks as they arrive
      for await (const chunk of result) {
        // Log the chunk structure to debug
        console.log(
          "Chunk structure:",
          JSON.stringify({
            hasText: !!chunk.text,
            hasFunctionCalls: !!chunk.functionCalls,
            candidates: chunk.candidates?.length || 0,
          })
        );

        // Try to get text from the response
        // The warning suggests using .text() concatenates all parts
        // Let's try accessing candidates->content->parts directly
        if (chunk.candidates && chunk.candidates.length > 0) {
          const candidate = chunk.candidates[0];
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.text) {
                yield { type: "content", content: part.text };
              }
            }
          }
        }

        // Check for function calls
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (const functionCall of chunk.functionCalls) {
            console.log("Raw function call from Gemini:", {
              name: functionCall.name,
              hasArgs: !!functionCall.args,
              argsKeys: functionCall.args ? Object.keys(functionCall.args) : [],
            });

            if (functionCall.name && functionCall.args) {
              console.log("Function call detected:", functionCall.name);
              yield {
                type: "function_call",
                function_call: {
                  name: functionCall.name,
                  args: functionCall.args,
                },
              };
            }
          }
        }
      }

      // Signal completion and exit successfully
      yield { type: "done", done: true };
      return;
    } catch (error) {
      lastError = error;
      console.error(`Stream chat attempt ${attempt + 1} failed:`, error);

      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        break;
      }

      const delay = getRetryDelay(attempt);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // If all retries failed, throw the last error
  throw lastError;
}
