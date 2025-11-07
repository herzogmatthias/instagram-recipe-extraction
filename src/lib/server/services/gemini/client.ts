import { GoogleGenAI } from "@google/genai";
import { GeminiUploadError } from "./types";

export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_POLL_INTERVAL_MS = 5_000;
export const DEFAULT_RECIPE_MODEL =
  process.env.GEMINI_RECIPE_MODEL ?? "gemini-2.5-flash";
export const DEFAULT_EXTRACTION_TEMPERATURE = Number(
  process.env.GEMINI_TEMPERATURE ?? 0.2
);
export const MAX_EXTRACTION_ATTEMPTS = 2;

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
