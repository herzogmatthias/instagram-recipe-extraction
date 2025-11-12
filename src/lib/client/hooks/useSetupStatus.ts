/**
 * useSetupStatus Hook
 * Fetches user preferences and derives readiness flags
 */

"use client";

import { useState, useEffect } from "react";
import type { UserPreferencesDocument } from "@/models/UserPreferences";
import {
  deriveReadinessFlags,
  type ReadinessFlags,
} from "@/lib/client/utils/readinessFlags";

export type SetupStatus = {
  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error state
   */
  error: string | null;

  /**
   * User preferences document
   */
  preferences: UserPreferencesDocument | null;

  /**
   * Derived readiness flags
   */
  flags: ReadinessFlags;

  /**
   * Refetch preferences
   */
  refetch: () => Promise<void>;
};

/**
 * Hook to check setup status and readiness flags
 */
export function useSetupStatus(): SetupStatus {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] =
    useState<UserPreferencesDocument | null>(null);

  const fetchPreferences = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/preferences");

      if (!response.ok) {
        throw new Error(`Failed to fetch preferences: ${response.statusText}`);
      }

      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      console.error("Error fetching setup status:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch setup status"
      );
      setPreferences(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const flags = deriveReadinessFlags(preferences);

  return {
    isLoading,
    error,
    preferences,
    flags,
    refetch: fetchPreferences,
  };
}
