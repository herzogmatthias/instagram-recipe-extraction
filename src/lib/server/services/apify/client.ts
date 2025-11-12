import { ApifyClient } from "apify-client";
import { InstagramScrapeError } from "./types";
import { getUserPreferences } from "../firestore/userpreferences";
import { decryptSecret, unwrapDEK, getMasterKey } from "../encryption/crypto";

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

/**
 * Gets Apify API key from encrypted Firestore secrets or falls back to env var
 */
async function getApifyApiKey(): Promise<string> {
  try {
    const preferences = await getUserPreferences();
    const encryptedKey = preferences?.secrets?.items?.APIFY_API_KEY;

    if (encryptedKey && preferences?.secrets?.dek_wrapped) {
      const masterKey = getMasterKey();
      const dek = unwrapDEK(preferences.secrets.dek_wrapped, masterKey);
      return decryptSecret(encryptedKey, dek);
    }
  } catch (error) {
    console.warn(
      "Failed to fetch Apify API key from Firestore, using env fallback:",
      error
    );
  }

  // Fallback to env variable
  const token = process.env.APIFY_API_KEY;
  if (!token) {
    throw new InstagramScrapeError(
      "TRANSIENT_ERROR",
      "APIFY_API_KEY must be configured in Settings or environment variables"
    );
  }
  return token;
}

let apifyClientInstance: ApifyClient | null = null;
let apiKeyPromise: Promise<string> | null = null;

export async function getApifyClient(): Promise<ApifyClient> {
  if (apifyClientInstance) {
    return apifyClientInstance;
  }

  if (!apiKeyPromise) {
    apiKeyPromise = getApifyApiKey();
  }

  const token = await apiKeyPromise;
  apifyClientInstance = new ApifyClient({ token });
  return apifyClientInstance;
}

export function __resetApifyClientForTests() {
  apifyClientInstance = null;
}
