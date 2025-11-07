import { ApifyClient } from "apify-client";
import { InstagramScrapeError } from "./types";

export const ACTOR_BY_TYPE = {
  post: "apify/instagram-post-scraper",
  reel: "apify/instagram-reel-scraper",
} as const;

export const DEFAULT_RETRY = {
  maxRetries: 2,
  initialDelayMs: 200,
  backoffMultiplier: 2,
};

export const SHORTCODE_REGEX = /\/(?:p|reel)\/([^/?#]+)/i;

let apifyClientInstance: ApifyClient | null = null;

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

export function __resetApifyClientForTests() {
  apifyClientInstance = null;
}
