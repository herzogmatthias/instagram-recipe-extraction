import { GoogleGenAI, FileState } from "@google/genai";
import type { File as GeminiFile } from "@google/genai";
import type { CommentThread, RecipeData } from "@/models/InstagramRecipePost";
import {
  getRecipeResponseSchema,
  parseRecipeDataResult,
} from "@/lib/shared/utils/recipeValidator";
import { SYSTEM_PROMPT } from "@/lib/shared/constants/llm";

export type GeminiUploadErrorCode =
  | "MISSING_API_KEY"
  | "UPLOAD_FAILED"
  | "FAILED_PROCESSING"
  | "TIMEOUT";

export type GeminiExtractionErrorCode =
  | "GENERATION_FAILED"
  | "INVALID_JSON"
  | "VALIDATION_FAILED"
  | "NO_RECIPE"
  | "AMBIGUOUS_RECIPE";

export interface UploadToGeminiOptions {
  displayName?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface ExtractRecipeParams {
  geminiFileUri: string;
  mediaMimeType?: string;
  caption?: string;
  hashtags?: string[];
  ownerUsername?: string;
  latestComments?: CommentThread[];
}

export interface ExtractRecipeOptions {
  maxAttempts?: number;
}

export interface RecipeExtractionResult {
  recipe: RecipeData;
}

export class GeminiUploadError extends Error {
  readonly code: GeminiUploadErrorCode;

  constructor(
    code: GeminiUploadErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.code = code;
    this.name = "GeminiUploadError";
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class GeminiExtractionError extends Error {
  readonly code: GeminiExtractionErrorCode;

  constructor(
    code: GeminiExtractionErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.code = code;
    this.name = "GeminiExtractionError";
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_RECIPE_MODEL =
  process.env.GEMINI_RECIPE_MODEL ?? "gemini-2.5-flash";
const DEFAULT_EXTRACTION_TEMPERATURE = Number(
  process.env.GEMINI_TEMPERATURE ?? 0.2
);
const MAX_EXTRACTION_ATTEMPTS = 2;

const recipeResponseSchema = getRecipeResponseSchema();

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (geminiClient) {
    return geminiClient;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiUploadError(
      "MISSING_API_KEY",
      "GEMINI_API_KEY must be configured for Gemini access"
    );
  }

  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

export function initializeGemini() {
  return getGeminiClient();
}

export async function uploadToGemini(
  filePath: string,
  mimeType: string,
  options?: UploadToGeminiOptions
): Promise<GeminiFile> {
  const client = getGeminiClient();

  let uploaded: GeminiFile;
  try {
    uploaded = await client.files.upload({
      file: filePath,
      config: {
        mimeType,
        displayName: options?.displayName,
      },
    });
  } catch (error) {
    throw new GeminiUploadError(
      "UPLOAD_FAILED",
      "Failed to upload media to Gemini",
      {
        cause: error,
      }
    );
  }

  if (!uploaded.name) {
    throw new GeminiUploadError(
      "UPLOAD_FAILED",
      "Gemini upload did not return a file name"
    );
  }

  return waitForGeminiFile(uploaded.name, options);
}

export async function waitForGeminiFile(
  fileName: string,
  options?: UploadToGeminiOptions
): Promise<GeminiFile> {
  const client = getGeminiClient();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollInterval = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startTime = Date.now();

  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      throw new GeminiUploadError(
        "TIMEOUT",
        "Timed out while waiting for Gemini to process file"
      );
    }

    let file: GeminiFile;
    try {
      file = await client.files.get({ name: fileName });
    } catch (error) {
      throw new GeminiUploadError(
        "UPLOAD_FAILED",
        "Failed to fetch Gemini file state",
        {
          cause: error,
        }
      );
    }

    if (file.state === FileState.ACTIVE) {
      return file;
    }

    if (file.state === FileState.FAILED) {
      throw new GeminiUploadError(
        "FAILED_PROCESSING",
        file.error?.message ?? "Gemini failed to process file"
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

export async function extractRecipe(
  params: ExtractRecipeParams
): Promise<{ recipe: RecipeData }> {
  const client = initializeGemini();

  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_EXTRACTION_ATTEMPTS; attempt++) {
    try {
      const resp = await client.models.generateContent({
        model: DEFAULT_RECIPE_MODEL,
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
          responseSchema: recipeResponseSchema, // <- flat RecipeData schema
          maxOutputTokens: 10000,
        },
      });

      const raw = resp.text?.trim();
      if (!raw) throw new Error("Empty response");

      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch (e) {
        // Only case we consider retry-worthy
        if (attempt < MAX_EXTRACTION_ATTEMPTS) {
          lastErr = e;
          continue;
        }
        throw e;
      }

      const parsed = parseRecipeDataResult(json);
      if (!parsed.valid) {
        // Treat schema mismatch as final (fix prompt/schema instead of looping forever)
        const reasons = parsed.issues.slice(0, 3).join(" | ");
        throw new Error(`RecipeData validation failed: ${reasons}`);
      }

      return { recipe: parsed.recipe };
    } catch (e) {
      lastErr = e;
      if (attempt >= MAX_EXTRACTION_ATTEMPTS) throw e;
    }
  }

  // Shouldn’t reach here, but for completeness:
  throw lastErr ?? new Error("Gemini extraction failed");
}

function buildUserPrompt(params: ExtractRecipeParams) {
  const parts: string[] = [];

  if (params.caption) {
    parts.push(`CAPTION\n${params.caption}`);
  }
  if (params.hashtags?.length) {
    parts.push(`HASHTAGS\n${params.hashtags.map((t) => `#${t}`).join(" ")}`);
  }

  const ownerComments = collectOwnerComments(
    params.ownerUsername,
    params.latestComments
  );
  if (ownerComments.length) {
    parts.push(
      `AUTHOR COMMENTS\n${ownerComments.map((c) => `- ${c}`).join("\n")}`
    );
  }

  parts.push(
    `MEDIA\nA media file is attached; use it only to infer missing specifics (quantities, doneness, timings).`
  );
  parts.push(`Now extract the recipe.`);

  return parts.join("\n\n");
}

function collectOwnerComments(
  ownerUsername?: string,
  comments?: CommentThread[]
) {
  if (!ownerUsername || !Array.isArray(comments)) {
    return [];
  }

  return comments
    .filter(
      (comment) =>
        comment.ownerUsername === ownerUsername &&
        typeof comment.text === "string" &&
        comment.text.trim().length > 0
    )
    .map((comment) => comment.text.trim())
    .slice(0, 3);
}

export function __resetGeminiClientForTests() {
  geminiClient = null;
}
