import { ApifyApiError } from "apify-client";
import { InstagramScrapeError } from "./types";

export function handleApifyError(error: unknown): never {
  if (error instanceof InstagramScrapeError) {
    throw error;
  }

  if (error instanceof ApifyApiError) {
    if (error.statusCode === 429) {
      throw new InstagramScrapeError(
        "RATE_LIMITED",
        "Apify rate limit exceeded",
        { cause: error }
      );
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
