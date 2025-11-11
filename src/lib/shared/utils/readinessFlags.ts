/**
 * Readiness flags utility
 * Determines what features are available based on user preferences configuration
 */

import type { UserPreferencesDocument } from "@/models/UserPreferences";

/**
 * Readiness flags for different features
 */
export type ReadinessFlags = {
  /**
   * UI is ready - Firebase Client SDK configured
   * Enables: Client-side Firebase Auth and Firestore access
   */
  uiReady: boolean;

  /**
   * Write operations are ready - Firestore Admin SDK configured
   * Enables: Saving recipes, variants, chat threads to Firestore
   */
  writeReady: boolean;

  /**
   * Recipe extraction is ready - All services configured
   * Enables: Import Instagram link feature (requires Apify + Gemini + Firestore)
   */
  extractionReady: boolean;

  /**
   * Overall setup completion status
   */
  isComplete: boolean;

  /**
   * Missing configuration items
   */
  missing: {
    clientConfig?: boolean;
    firebaseAdmin?: boolean;
    apifyKey?: boolean;
    geminiKey?: boolean;
    modelPreference?: boolean;
  };
};

/**
 * Derive readiness flags from user preferences
 *
 * Logic:
 * - uiReady: Firebase Client SDK configured (7 required fields)
 * - writeReady: uiReady + Firestore Admin SDK configured
 * - extractionReady: writeReady + Apify API key + Gemini API key + Model preference
 */
export function deriveReadinessFlags(
  preferences: UserPreferencesDocument | null
): ReadinessFlags {
  const flags: ReadinessFlags = {
    uiReady: false,
    writeReady: false,
    extractionReady: false,
    isComplete: false,
    missing: {},
  };

  // Check Firebase Client Config (required for uiReady)
  const hasClientConfig =
    preferences?.clientConfig &&
    preferences.clientConfig.apiKey &&
    preferences.clientConfig.authDomain &&
    preferences.clientConfig.projectId &&
    preferences.clientConfig.storageBucket &&
    preferences.clientConfig.messagingSenderId &&
    preferences.clientConfig.appId;

  if (!hasClientConfig) {
    flags.missing.clientConfig = true;
    flags.missing.firebaseAdmin = true;
    flags.missing.apifyKey = true;
    flags.missing.geminiKey = true;
    flags.missing.modelPreference = true;
    return flags; // Can't proceed without client config
  }

  flags.uiReady = true;

  // Check Firestore Admin SDK (required for writeReady)
  const hasFirebaseAdmin =
    preferences?.secrets?.items?.FIREBASE_SA_JSON !== undefined;

  if (!hasFirebaseAdmin) {
    flags.missing.firebaseAdmin = true;
    flags.missing.apifyKey = true;
    flags.missing.geminiKey = true;
    flags.missing.modelPreference = true;
    return flags; // Can't proceed without admin SDK
  }

  flags.writeReady = true;

  // Check Apify API Key (required for extractionReady)
  const hasApifyKey = preferences?.secrets?.items?.APIFY_API_KEY !== undefined;

  if (!hasApifyKey) {
    flags.missing.apifyKey = true;
  }

  // Check Gemini API Key (required for extractionReady)
  const hasGeminiKey =
    preferences?.secrets?.items?.GEMINI_API_KEY !== undefined;

  if (!hasGeminiKey) {
    flags.missing.geminiKey = true;
  }

  // Check Model Preference (required for extractionReady)
  const hasModelPreference =
    preferences?.modelPreference?.geminiDefaultModel !== undefined;

  if (!hasModelPreference) {
    flags.missing.modelPreference = true;
  }

  // extractionReady requires all of: Apify, Gemini, Model
  flags.extractionReady = hasApifyKey && hasGeminiKey && hasModelPreference;

  // isComplete means extractionReady (all features unlocked)
  flags.isComplete = flags.extractionReady;

  return flags;
}

/**
 * Get user-friendly message about what's missing
 */
export function getMissingConfigMessage(flags: ReadinessFlags): string {
  if (flags.isComplete) {
    return "Setup complete! All features are available.";
  }

  const missing: string[] = [];

  if (flags.missing.clientConfig) {
    missing.push("Firebase Client SDK");
  }
  if (flags.missing.firebaseAdmin) {
    missing.push("Firebase Admin SDK");
  }
  if (flags.missing.apifyKey) {
    missing.push("Apify API Key");
  }
  if (flags.missing.geminiKey) {
    missing.push("Gemini API Key");
  }
  if (flags.missing.modelPreference) {
    missing.push("Model Preference");
  }

  if (missing.length === 0) {
    return "Setup is almost complete!";
  }

  return `Missing: ${missing.join(", ")}`;
}

/**
 * Get completion percentage
 */
export function getSetupProgress(flags: ReadinessFlags): number {
  const total = 5; // clientConfig, firebaseAdmin, apifyKey, geminiKey, modelPreference
  let completed = 0;

  if (flags.missing.clientConfig !== true) completed++;
  if (flags.missing.firebaseAdmin !== true) completed++;
  if (flags.missing.apifyKey !== true) completed++;
  if (flags.missing.geminiKey !== true) completed++;
  if (flags.missing.modelPreference !== true) completed++;

  return Math.round((completed / total) * 100);
}
