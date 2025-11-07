import type { InstagramRecipePost } from "@/models/InstagramRecipePost";

export type InstagramContentType = "post" | "reel";

export type ScrapeErrorCode =
  | "INVALID_URL"
  | "MISSING_USERNAME"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "PRIVATE_POST"
  | "TRANSIENT_ERROR";

export interface ScrapeInstagramPostParams {
  url: string;
}

export interface ScrapeInstagramPostOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
}

export class InstagramScrapeError extends Error {
  readonly code: ScrapeErrorCode;

  constructor(
    code: ScrapeErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.code = code;
    this.name = "InstagramScrapeError";
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export type RawApifyInstagramPost = Partial<
  Omit<InstagramRecipePost, "recipe_data">
> & {
  short_code?: string;
};
