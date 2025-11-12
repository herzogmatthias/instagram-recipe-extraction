import { GoogleGenAI } from "@google/genai";
import { GeminiUploadError } from "./types";
import { getUserPreferences } from "../firestore/userpreferences";
import { decryptSecret, unwrapDEK, getMasterKey } from "../encryption/crypto";

export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_POLL_INTERVAL_MS = 5_000;
const FALLBACK_MODEL = process.env.GEMINI_RECIPE_MODEL ?? "gemini-2.5-flash";
export const DEFAULT_EXTRACTION_TEMPERATURE = Number(
  process.env.GEMINI_TEMPERATURE ?? 0.2
);
export const MAX_EXTRACTION_ATTEMPTS = 2;

/**
 * Gets the default Gemini model from user preferences or falls back to env var
 */
export async function getDefaultModel(): Promise<string> {
  try {
    const preferences = await getUserPreferences();
    const model = preferences?.modelPreference?.geminiDefaultModel;
    return model || FALLBACK_MODEL;
  } catch (error) {
    console.warn("Failed to fetch model preference, using fallback:", error);
    return FALLBACK_MODEL;
  }
}

/**
 * Gets Gemini API key from encrypted Firestore secrets or falls back to env var
 */
async function getGeminiApiKey(): Promise<string> {
  try {
    const preferences = await getUserPreferences();
    const encryptedKey = preferences?.secrets?.items?.GEMINI_API_KEY;

    if (encryptedKey && preferences?.secrets?.dek_wrapped) {
      const masterKey = getMasterKey();
      const dek = unwrapDEK(preferences.secrets.dek_wrapped, masterKey);
      return decryptSecret(encryptedKey, dek);
    }
  } catch (error) {
    console.warn(
      "Failed to fetch Gemini API key from Firestore, using env fallback:",
      error
    );
  }

  // Fallback to env variable
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiUploadError(
      "MISSING_API_KEY",
      "GEMINI_API_KEY must be configured in Settings or environment variables"
    );
  }
  return apiKey;
}

let geminiClient: GoogleGenAI | null = null;
let apiKeyPromise: Promise<string> | null = null;

export async function getGeminiClient(): Promise<GoogleGenAI> {
  if (geminiClient) {
    return geminiClient;
  }

  if (!apiKeyPromise) {
    apiKeyPromise = getGeminiApiKey();
  }

  const apiKey = await apiKeyPromise;
  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

export async function initializeGemini() {
  return getGeminiClient();
}

export function __resetGeminiClientForTests() {
  geminiClient = null;
}
