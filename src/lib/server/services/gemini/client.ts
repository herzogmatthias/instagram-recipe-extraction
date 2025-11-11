import { GoogleGenAI } from "@google/genai";
import { GeminiUploadError } from "./types";
import { getUserPreferences } from "../firestore/userpreferences";

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

export function __resetGeminiClientForTests() {
  geminiClient = null;
}
