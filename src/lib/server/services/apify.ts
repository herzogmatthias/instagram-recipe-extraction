import { ApifyApiError, ApifyClient } from "apify-client";
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
  username: string;
  url: string;
}

export interface ScrapeInstagramPostOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
}

const ACTOR_BY_TYPE: Record<InstagramContentType, string> = {
  post: "apify/instagram-post-scraper",
  reel: "apify/instagram-reel-scraper",
};

const DEFAULT_RETRY = {
  maxRetries: 2,
  initialDelayMs: 200,
  backoffMultiplier: 2,
};

const SHORTCODE_REGEX = /\/(?:p|reel)\/([^/?#]+)/i;

let apifyClientInstance: ApifyClient | null = null;

export class InstagramScrapeError extends Error {
  readonly code: ScrapeErrorCode;

  constructor(code: ScrapeErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.code = code;
    this.name = "InstagramScrapeError";
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function getApifyClient(): ApifyClient {
  if (apifyClientInstance) {
    return apifyClientInstance;
  }

  const token = process.env.APIFY_API_KEY;
  if (!token) {
    throw new InstagramScrapeError(
      "TRANSIENT_ERROR",
      "APIFY_API_KEY is not configured in the environment"
    );
  }

  apifyClientInstance = new ApifyClient({ token });
  return apifyClientInstance;
}

export function detectPostType(rawUrl: string): InstagramContentType {
  const normalized = normalizeInstagramUrl(rawUrl);
  return normalized.includes("/reel/") ? "reel" : "post";
}

export async function scrapeInstagramPost(
  params: ScrapeInstagramPostParams,
  options?: ScrapeInstagramPostOptions
): Promise<InstagramRecipePost> {
  const normalizedUrl = normalizeInstagramUrl(params.url);
  const contentType = detectPostType(normalizedUrl);
  const actorId = ACTOR_BY_TYPE[contentType];
  const runInput = buildActorInput(params.username);

  const rawPost = await withRetry(
    async () => {
      const client = getApifyClient();

      let run;
      try {
        run = await client.actor(actorId).call({ runInput });
      } catch (error) {
        handleApifyError(error);
      }

      if (!run?.defaultDatasetId) {
        throw new InstagramScrapeError(
          "TRANSIENT_ERROR",
          "Apify run did not provide a dataset identifier"
        );
      }

      let datasetItems;
      try {
        datasetItems = await client.dataset(run.defaultDatasetId).listItems({
          limit: 1,
          clean: true,
        });
      } catch (error) {
        handleApifyError(error);
      }

      const items = datasetItems?.items ?? [];
      if (!items.length) {
        throw new InstagramScrapeError(
          "PRIVATE_POST",
          "Apify returned no data. The Instagram post might be private or unavailable."
        );
      }

      return items[0] as RawApifyInstagramPost;
    },
    options
  );

  return transformApifyItem(rawPost, normalizedUrl, contentType);
}

function normalizeInstagramUrl(rawUrl: string): string {
  if (!rawUrl || !rawUrl.trim()) {
    throw new InstagramScrapeError("INVALID_URL", "Instagram URL is required");
  }

  const candidate = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new InstagramScrapeError("INVALID_URL", `Invalid Instagram URL: ${rawUrl}`);
  }

  if (!parsed.hostname.includes("instagram.")) {
    throw new InstagramScrapeError("INVALID_URL", "URL must point to instagram.com");
  }

  parsed.hash = "";
  return parsed.toString();
}

function buildActorInput(username: string) {
  if (!username || !username.trim()) {
    throw new InstagramScrapeError("MISSING_USERNAME", "Username is required for Apify runs");
  }
  return { usernames: [username], resultsLimit: 1 } as const;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options?: ScrapeInstagramPostOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? DEFAULT_RETRY.maxRetries;
  const multiplier = options?.backoffMultiplier ?? DEFAULT_RETRY.backoffMultiplier;
  let delay = options?.initialDelayMs ?? DEFAULT_RETRY.initialDelayMs;
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

function isRetryableError(error: unknown) {
  if (error instanceof InstagramScrapeError) {
    return error.code === "RATE_LIMITED" || error.code === "TRANSIENT_ERROR";
  }
  if (error instanceof ApifyApiError) {
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  return false;
}

function handleApifyError(error: unknown): never {
  if (error instanceof InstagramScrapeError) {
    throw error;
  }

  if (error instanceof ApifyApiError) {
    if (error.statusCode === 429) {
      throw new InstagramScrapeError("RATE_LIMITED", "Apify rate limit exceeded", { cause: error });
    }

    if (error.statusCode === 403) {
      throw new InstagramScrapeError(
        "PRIVATE_POST",
        "Instagram post is private or inaccessible",
        { cause: error }
      );
    }

    if (error.statusCode === 402 || error.type === "usage-limit-exceeded") {
      throw new InstagramScrapeError(
        "QUOTA_EXCEEDED",
        "Apify API quota has been exhausted",
        { cause: error }
      );
    }

    if (error.statusCode >= 500) {
      throw new InstagramScrapeError(
        "TRANSIENT_ERROR",
        "Apify service is temporarily unavailable",
        { cause: error }
      );
    }
  }

  throw new InstagramScrapeError(
    "TRANSIENT_ERROR",
    "Unexpected Apify error occurred",
    { cause: error }
  );
}

type RawApifyInstagramPost = Partial<Omit<InstagramRecipePost, "recipe_data">> & {
  short_code?: string;
};

function transformApifyItem(
  raw: RawApifyInstagramPost,
  inputUrl: string,
  contentType: InstagramContentType
): InstagramRecipePost {
  if (!raw) {
    throw new InstagramScrapeError("TRANSIENT_ERROR", "Apify returned an empty record");
  }

  const shortCode =
    raw.shortCode ?? raw.short_code ?? raw.id ?? extractShortCodeFromUrl(inputUrl);
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

function extractShortCodeFromUrl(url: string) {
  const match = url.match(SHORTCODE_REGEX);
  return match?.[1] ?? "";
}

export function __resetApifyClientForTests() {
  apifyClientInstance = null;
}
