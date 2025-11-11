/**
 * Shared types for settings components
 */

import type {
  FirebaseClientConfig,
  ModelPreference,
} from "@/models/UserPreferences";

/**
 * Configuration status
 */
export type ConfigStatus = "not-configured" | "ready" | "error";

/**
 * Secret metadata for display
 */
export type SecretMetadata = {
  name: string;
  last4?: string;
  lastValidatedAt?: string;
  isConfigured: boolean;
};

/**
 * Validation result
 */
export type ValidationResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

/**
 * Backend secrets form data
 */
export type BackendSecretsFormData = {
  APIFY_API_KEY?: string;
  GEMINI_API_KEY?: string;
  FIREBASE_SA_JSON?: string;
};

/**
 * Settings page status
 */
export type SettingsPageStatus = {
  clientConfigStatus: ConfigStatus;
  secretsStatus: ConfigStatus;
  modelPreferenceStatus: ConfigStatus;
  overallStatus: ConfigStatus;
};

/**
 * Props for Firebase Client Card
 */
export type FirebaseClientCardProps = {
  initialConfig?: FirebaseClientConfig;
  onConfigSaved?: (config: FirebaseClientConfig) => void;
};

/**
 * Props for Backend Secrets Card
 */
export type BackendSecretsCardProps = {
  existingSecrets?: SecretMetadata[];
  onSecretsSaved?: () => void;
};

/**
 * Props for Model Preference Card
 */
export type ModelPreferenceCardProps = {
  initialPreference?: ModelPreference;
  onPreferenceSaved?: (preference: ModelPreference) => void;
};
