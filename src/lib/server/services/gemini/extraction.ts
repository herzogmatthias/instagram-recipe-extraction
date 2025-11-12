import type { RecipeData } from "@/models/InstagramRecipePost";
import {
  getRecipeResponseSchema,
  parseRecipeDataResult,
} from "@/lib/shared/utils/recipeValidator";
import { SYSTEM_PROMPT } from "@/lib/server/constants/llm";
import { initializeGemini, getDefaultModel } from "./client";
import {
  DEFAULT_EXTRACTION_TEMPERATURE,
  MAX_EXTRACTION_ATTEMPTS,
} from "./client";
import type { ExtractRecipeParams } from "./types";
import { buildUserPrompt } from "./utils";

export async function extractRecipe(
  params: ExtractRecipeParams
): Promise<{ recipe: RecipeData }> {
  const client = await initializeGemini();
  const recipeResponseSchema = getRecipeResponseSchema();
  const model = await getDefaultModel();

  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_EXTRACTION_ATTEMPTS; attempt++) {
    try {
      const resp = await client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: buildUserPrompt(params) },
              params.geminiFileUri && {
                fileData: {
                  fileUri: params.geminiFileUri,
                  mimeType: params.mediaMimeType ?? "application/octet-stream",
                },
              },
            ].filter(
              (
                part
              ): part is
                | { text: string }
                | { fileData: { fileUri: string; mimeType: string } } =>
                Boolean(part)
            ),
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: DEFAULT_EXTRACTION_TEMPERATURE,
          responseMimeType: "application/json",
          responseSchema: recipeResponseSchema,
          maxOutputTokens: 10000,
        },
      });

      const raw = resp.text?.trim();
      if (!raw) throw new Error("Empty response");

      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch (e) {
        if (attempt < MAX_EXTRACTION_ATTEMPTS) {
          lastErr = e;
          continue;
        }
        throw e;
      }

      const parsed = parseRecipeDataResult(json);
      if (!parsed.valid) {
        const reasons = parsed.issues.slice(0, 3).join(" | ");
        throw new Error(`RecipeData validation failed: ${reasons}`);
      }

      return { recipe: parsed.recipe };
    } catch (e) {
      lastErr = e;
      if (attempt >= MAX_EXTRACTION_ATTEMPTS) throw e;
    }
  }

  throw lastErr ?? new Error("Gemini extraction failed");
}
