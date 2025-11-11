/**
 * Utility functions for settings operations
 */

import type { ConfigStatus, SettingsPageStatus } from "./settings.types";

/**
 * Determine overall configuration status
 */
export function getOverallStatus(
  clientConfigStatus: ConfigStatus,
  secretsStatus: ConfigStatus,
  modelPreferenceStatus: ConfigStatus
): ConfigStatus {
  if (
    clientConfigStatus === "error" ||
    secretsStatus === "error" ||
    modelPreferenceStatus === "error"
  ) {
    return "error";
  }

  if (
    clientConfigStatus === "ready" &&
    secretsStatus === "ready" &&
    modelPreferenceStatus === "ready"
  ) {
    return "ready";
  }

  return "not-configured";
}

/**
 * Validate Firebase client config fields
 */
export function validateFirebaseConfig(config: {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}): { valid: boolean; missing: string[] } {
  const requiredFields = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];

  const missing = requiredFields.filter(
    (field) => !config[field as keyof typeof config]
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate Gemini model name format
 */
export function validateGeminiModel(model: string): boolean {
  if (!model || model.trim().length === 0) {
    return false;
  }

  // Basic validation: should start with "gemini-"
  return model.trim().startsWith("gemini-");
}

/**
 * Format timestamp for display
 */
export function formatLastValidated(timestamp?: string): string {
  if (!timestamp) {
    return "Never";
  }

  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return "Just now";
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `${days} day${days === 1 ? "" : "s"} ago`;
    }
  } catch {
    return "Invalid date";
  }
}

/**
 * Parse service account JSON safely
 */
export function parseServiceAccountJSON(jsonString: string): {
  valid: boolean;
  error?: string;
  data?: Record<string, unknown>;
} {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate it has required service account fields
    const requiredFields = ["project_id", "private_key", "client_email"];
    const missing = requiredFields.filter((field) => !(field in parsed));

    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      };
    }

    return {
      valid: true,
      data: parsed,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

/**
 * Get status badge color
 */
export function getStatusBadgeVariant(
  status: ConfigStatus
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "ready":
      return "default";
    case "error":
      return "destructive";
    default:
      return "secondary";
  }
}

/**
 * Get status badge text
 */
export function getStatusBadgeText(status: ConfigStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "error":
      return "Error";
    default:
      return "Not Configured";
  }
}
