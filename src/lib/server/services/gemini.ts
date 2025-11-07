import { GoogleGenAI, FileState } from "@google/genai";
import type { File as GeminiFile } from "@google/genai";
import type { CommentThread, RecipeData } from "@/models/InstagramRecipePost";
import {
  getRecipeResponseSchema,
  type RecipeValidationIssue,
  validateRecipeData,
} from "@/lib/shared/utils/recipeValidator";

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
  confidence: number;
  issues: RecipeValidationIssue[];
  rawText: string;
  reasoning?: string[];
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
  params: ExtractRecipeParams,
  options?: ExtractRecipeOptions
): Promise<RecipeExtractionResult> {
  const client = initializeGemini();
  const maxAttempts = options?.maxAttempts ?? MAX_EXTRACTION_ATTEMPTS;
  let lastError: GeminiExtractionError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await client.models.generateContent({
        model: DEFAULT_RECIPE_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: buildRecipePrompt(params) },
              {
                fileData: {
                  fileUri: params.geminiFileUri,
                  mimeType: params.mediaMimeType ?? "application/octet-stream",
                },
              },
            ],
          },
        ],
        config: {
          temperature: DEFAULT_EXTRACTION_TEMPERATURE,
          responseMimeType: "application/json",
          maxOutputTokens: 10000,
          responseSchema: recipeResponseSchema,
        },
      });

      const rawText = extractResponseText(response);
      const payload = parseRecipePayload(rawText);
      const candidate = pickRecipeCandidate(payload);
      const validation = validateRecipeData(candidate);

      if (!validation.valid || !validation.recipe) {
        throw new GeminiExtractionError(
          "VALIDATION_FAILED",
          validation.issues[0]?.message ?? "Recipe JSON failed validation"
        );
      }

      const normalizedRecipe: RecipeData = {
        ...validation.recipe,
        confidence: validation.confidence ?? validation.recipe.confidence,
      };

      return {
        recipe: normalizedRecipe,
        confidence: normalizedRecipe.confidence ?? 0,
        issues: validation.issues,
        rawText,
        reasoning: Array.isArray(payload?.reasoning)
          ? payload.reasoning.filter(
              (entry: unknown): entry is string => typeof entry === "string"
            )
          : undefined,
      };
    } catch (error) {
      const extractionError =
        error instanceof GeminiExtractionError
          ? error
          : wrapExtractionError(error);
      lastError = extractionError;

      const shouldRetry =
        attempt < maxAttempts &&
        ["INVALID_JSON", "VALIDATION_FAILED"].includes(extractionError.code);

      if (!shouldRetry) {
        throw extractionError;
      }
    }
  }

  throw (
    lastError ??
    new GeminiExtractionError(
      "GENERATION_FAILED",
      "Gemini extraction failed unexpectedly"
    )
  );
}

function wrapExtractionError(error: unknown): GeminiExtractionError {
  if (error instanceof GeminiExtractionError) {
    return error;
  }

  if (error instanceof SyntaxError) {
    return new GeminiExtractionError(
      "INVALID_JSON",
      "Gemini returned invalid JSON",
      {
        cause: error,
      }
    );
  }

  return new GeminiExtractionError(
    "GENERATION_FAILED",
    "Gemini request failed",
    {
      cause: error,
    }
  );
}

function extractResponseText(response: { text?: string }) {
  if (response.text && response.text.trim().length > 0) {
    return response.text;
  }

  throw new GeminiExtractionError(
    "GENERATION_FAILED",
    "Gemini response missing text payload"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRecipePayload(rawText: string): any {
  if (!rawText || rawText.trim().length === 0) {
    throw new GeminiExtractionError("NO_RECIPE", "Gemini response was empty");
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    // Save the invalid response for debugging
    // const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    // const debugPath = path.join(
    //   ".",
    //   "tmp",
    //   `gemini-response-${timestamp}.json`
    // );

    // try {
    //   const dir = path.dirname(debugPath);
    //   if (!fs.existsSync(dir)) {
    //     fs.mkdirSync(dir, { recursive: true });
    //   }
    //   fs.writeFileSync(debugPath, rawText, "utf-8");
    //   console.error(`[Gemini] Invalid JSON saved to: ${debugPath}`);
    //   console.error(`[Gemini] Raw response length: ${rawText.length} chars`);
    //   console.error(`[Gemini] First 500 chars: ${rawText.substring(0, 500)}`);
    // } catch (writeError) {
    //   console.error("[Gemini] Failed to save debug response:", writeError);
    // }

    throw new GeminiExtractionError(
      "INVALID_JSON",
      `Gemini returned invalid JSON`,
      { cause: error }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickRecipeCandidate(payload: any) {
  if (!payload) {
    throw new GeminiExtractionError(
      "NO_RECIPE",
      "Gemini response missing recipe"
    );
  }

  const assembled = assembleRecipeFromEnvelope(payload);
  if (assembled) {
    return assembled;
  }

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      throw new GeminiExtractionError(
        "NO_RECIPE",
        "Gemini returned an empty recipe list"
      );
    }
    if (payload.length > 1) {
      throw new GeminiExtractionError(
        "AMBIGUOUS_RECIPE",
        "Gemini returned multiple recipes; please disambiguate"
      );
    }
    return assembleRecipeFromEnvelope(payload[0]) ?? payload[0];
  }

  if (Array.isArray(payload.recipes)) {
    if (payload.recipes.length === 0) {
      throw new GeminiExtractionError(
        "NO_RECIPE",
        "Gemini indicated no recipe was found"
      );
    }
    if (payload.recipes.length > 1) {
      throw new GeminiExtractionError(
        "AMBIGUOUS_RECIPE",
        "Gemini returned multiple recipes; please disambiguate"
      );
    }
    return (
      assembleRecipeFromEnvelope(payload.recipes[0]) ?? payload.recipes[0]
    );
  }

  if (payload.recipe) {
    return (
      assembleRecipeFromEnvelope(payload) ??
      payload.recipe
    );
  }

  if (looksLikeRecipe(payload)) {
    return payload;
  }

  throw new GeminiExtractionError(
    "NO_RECIPE",
    "Gemini response missing recognizable recipe data"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assembleRecipeFromEnvelope(candidate: any) {
  if (
    candidate &&
    typeof candidate === "object" &&
    candidate.recipe &&
    Array.isArray(candidate.ingredients) &&
    Array.isArray(candidate.steps)
  ) {
    return {
      ...candidate.recipe,
      ingredients: candidate.ingredients,
      steps: candidate.steps,
    };
  }
  return null;
}

function looksLikeRecipe(candidate: unknown) {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const maybeRecipe = candidate as Partial<RecipeData>;
  return (
    typeof maybeRecipe.title === "string" &&
    Array.isArray(maybeRecipe.ingredients) &&
    Array.isArray(maybeRecipe.steps)
  );
}

function buildRecipePrompt(params: ExtractRecipeParams) {
  const segments = [
    "You are a culinary assistant that extracts structured recipes from Instagram content. Respond with JSON only using the structured output schema provided to you - no Markdown.",
    "If the recipe is in another language than English, translate it to english as best as you can.",
    "Use the caption as the primary source. If ingredients or steps are missing there, inspect the provided media reference to infer them and describe that inference inside the `assumptions` array.",
    "Ensure ingredient ids are unique strings, include measurement details when visible, and keep instructions concise but complete.",
  ];

  if (params.caption) {
    segments.push(`Caption:\n${params.caption}`);
  }

  if (params.hashtags?.length) {
    segments.push(
      `Hashtags: ${params.hashtags.map((tag) => `#${tag}`).join(" ")}`
    );
  }

  const ownerComments = collectOwnerComments(
    params.ownerUsername,
    params.latestComments
  );
  if (ownerComments.length) {
    segments.push(
      `Author comments referencing the recipe:\n${ownerComments
        .map((comment) => `- ${comment}`)
        .join("\n")}`
    );
  }

  segments.push(
    "If no clear recipe is visible, respond with an empty `recipes` array. Do not invent ingredients or steps."
  );

  return segments.join("\n\n");
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
