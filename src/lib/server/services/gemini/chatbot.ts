/**
 * Gemini chatbot service for recipe Q&A and variant generation.
 * Handles function calling for createVariant operations.
 */

import { getGeminiClient } from "./client";
import { Type, FunctionDeclaration } from "@google/genai";
import type { RecipeData } from "@/models/InstagramRecipePost";
import type { ChatMessage } from "@/components/recipe-chatbot/RecipeChatbot.types";

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
  name: "create_recipe_variant",
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
  const client = getGeminiClient();

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
    model: "gemini-2.5-flash",
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
}

export async function* streamChatWithRecipe(
  request: ChatRequest
): AsyncGenerator<StreamChunk> {
  const client = getGeminiClient();

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
    model: "gemini-2.5-flash",
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

  // Signal completion
  yield { type: "done", done: true };
}

export async function generateVariantFromPrompt(
  prompt: string,
  currentRecipe: RecipeData
): Promise<{ name: string; recipe_data: RecipeData; changes: string[] }> {
  const client = getGeminiClient();

  const fullPrompt = `Given this recipe:
Title: ${currentRecipe.title}
Ingredients: ${currentRecipe.ingredients
    .map((i) => `${i.quantity || ""} ${i.unit || ""} ${i.name}`)
    .join(", ")}
Steps: ${currentRecipe.steps.map((s) => s.text).join(" ")}

User request: ${prompt}

Please generate a JSON response with the following structure:
{
  "name": "variant name (e.g., 'Spicy Version')",
  "recipe_data": { <complete modified recipe data with title, ingredients, steps, etc.> },
  "changes": ["list", "of", "key", "changes"]
}`;

  const result = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: fullPrompt }],
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const text = result.text?.trim();
  if (!text) {
    throw new Error("No variant generated");
  }

  const parsed = JSON.parse(text);

  return {
    name: parsed.name as string,
    recipe_data: parsed.recipe_data as RecipeData,
    changes: parsed.changes as string[],
  };
}
