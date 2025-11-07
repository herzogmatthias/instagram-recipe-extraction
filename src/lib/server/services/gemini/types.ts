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
  latestComments?: import("@/models/InstagramRecipePost").CommentThread[];
}

export interface ExtractRecipeOptions {
  maxAttempts?: number;
}

export interface RecipeExtractionResult {
  recipe: import("@/models/InstagramRecipePost").RecipeData;
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
