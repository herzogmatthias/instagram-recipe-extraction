import type { InstagramRecipePost } from "@/models/InstagramRecipePost";
import {
  InstagramScrapeError,
  type InstagramContentType,
  type RawApifyInstagramPost,
} from "./types";
import { SHORTCODE_REGEX } from "./client";

export function normalizeInstagramUrl(rawUrl: string): string {
  if (!rawUrl || !rawUrl.trim()) {
    throw new InstagramScrapeError("INVALID_URL", "Instagram URL is required");
  }

  const candidate = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new InstagramScrapeError(
      "INVALID_URL",
      `Invalid Instagram URL: ${rawUrl}`
    );
  }

  if (!parsed.hostname.includes("instagram.")) {
    throw new InstagramScrapeError(
      "INVALID_URL",
      "URL must point to instagram.com"
    );
  }

  parsed.hash = "";
  return parsed.toString();
}

export function detectPostType(rawUrl: string): InstagramContentType {
  const normalized = normalizeInstagramUrl(rawUrl);
  return normalized.includes("/reel/") ? "reel" : "post";
}

export function buildActorInput(postUrl: string) {
  if (!postUrl || !postUrl.trim()) {
    throw new InstagramScrapeError(
      "INVALID_URL",
      "Post URL is required for Apify runs"
    );
  }
  return { username: [postUrl], resultsLimit: 1 } as const;
}

export function extractShortCodeFromUrl(url: string): string {
  const match = url.match(SHORTCODE_REGEX);
  return match?.[1] ?? "";
}

export function transformApifyItem(
  raw: RawApifyInstagramPost,
  inputUrl: string,
  contentType: InstagramContentType
): InstagramRecipePost {
  if (!raw) {
    throw new InstagramScrapeError(
      "TRANSIENT_ERROR",
      "Apify returned an empty record"
    );
  }

  const shortCode =
    raw.shortCode ??
    raw.short_code ??
    raw.id ??
    extractShortCodeFromUrl(inputUrl);
  if (!shortCode) {
    throw new InstagramScrapeError(
      "TRANSIENT_ERROR",
      "Unable to determine Instagram shortcode from Apify payload"
    );
  }

  const id = raw.id ?? shortCode;

  return {
    ...raw,
    id,
    shortCode,
    inputUrl,
    url: raw.url ?? inputUrl,
    type: raw.type ?? (contentType === "reel" ? "Video" : "Image"),
    childPosts: raw.childPosts ?? [],
  } as InstagramRecipePost;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffMultiplier?: number;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;
  const multiplier = options?.backoffMultiplier ?? 2;
  let delay = options?.initialDelayMs ?? 200;
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      if (attempt > maxRetries || !isRetryableError(error)) {
        throw error;
      }
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      delay *= multiplier;
    }
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof InstagramScrapeError) {
    return error.code === "RATE_LIMITED" || error.code === "TRANSIENT_ERROR";
  }
  const apiError = error as { statusCode?: number };
  if (apiError.statusCode) {
    return apiError.statusCode === 429 || apiError.statusCode >= 500;
  }
  return false;
}
