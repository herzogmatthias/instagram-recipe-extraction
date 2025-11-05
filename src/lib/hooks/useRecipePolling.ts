"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  InstagramRecipePost,
  RecipeStatus,
} from "@/models/InstagramRecipePost";
import { QueueItem } from "./useProcessingQueue";

const TERMINAL_STATUSES: RecipeStatus[] = ["ready", "failed"];
const INITIAL_POLL_INTERVAL_MS = 1000; // 1 second
const MAX_POLL_INTERVAL_MS = 30000; // 30 seconds
const BACKOFF_MULTIPLIER = 1.5;
// No hard stop on consecutive errors; we rely on a no-progress timeout.

interface UseRecipePollingOptions {
  queueItems: QueueItem[];
  onStatusChange?: (
    recipeId: string,
    newStatus: RecipeStatus,
    recipe: InstagramRecipePost
  ) => void;
  onError?: (recipeId: string, error: Error) => void;
  onPollingStop?: (recipeId: string) => void;
  enabled?: boolean;
}

/**
 * Hook to poll recipes that are in non-terminal processing states.
 * Implements exponential backoff and handles errors gracefully.
 */
export function useRecipePolling({
  queueItems,
  onStatusChange,
  onError,
  onPollingStop,
  enabled = true,
}: UseRecipePollingOptions) {
  const pollIntervalsRef = useRef<Map<string, number>>(new Map());
  const pollTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const consecutiveErrorsRef = useRef<Map<string, number>>(new Map());
  const previousStatusesRef = useRef<Map<string, RecipeStatus>>(new Map());
  const lastProgressAtRef = useRef<Map<string, number>>(new Map());
  const activePollingRef = useRef<Set<string>>(new Set());
  const NO_PROGRESS_TIMEOUT_MS = 60000; // 60 seconds

  const isTerminalStatus = useCallback((status?: RecipeStatus): boolean => {
    return !status || TERMINAL_STATUSES.includes(status);
  }, []);

  const getNextPollInterval = useCallback((recipeId: string): number => {
    const currentInterval =
      pollIntervalsRef.current.get(recipeId) || INITIAL_POLL_INTERVAL_MS;
    const nextInterval = Math.min(
      currentInterval * BACKOFF_MULTIPLIER,
      MAX_POLL_INTERVAL_MS
    );
    pollIntervalsRef.current.set(recipeId, nextInterval);
    return nextInterval;
  }, []);

  const resetPollInterval = useCallback((recipeId: string) => {
    pollIntervalsRef.current.set(recipeId, INITIAL_POLL_INTERVAL_MS);
  }, []);

  const stopPolling = useCallback((recipeId: string) => {
    const timeout = pollTimeoutsRef.current.get(recipeId);
    if (timeout) {
      clearTimeout(timeout);
      pollTimeoutsRef.current.delete(recipeId);
    }
    pollIntervalsRef.current.delete(recipeId);
    consecutiveErrorsRef.current.delete(recipeId);
    activePollingRef.current.delete(recipeId);
  }, []);

  const pollRecipe = useCallback(
    async (recipeId: string) => {
      try {
        const response = await fetch(`/api/recipes/${recipeId}`);

        if (!response.ok) {
          throw new Error(`Failed to poll recipe: ${response.statusText}`);
        }

        const updatedRecipe: InstagramRecipePost = await response.json();

        // Reset error count on successful poll
        consecutiveErrorsRef.current.set(recipeId, 0);

        // Check if status changed
        const previousStatus = previousStatusesRef.current.get(recipeId);
        const currentStatus = updatedRecipe.status;

        if (currentStatus && previousStatus !== currentStatus) {
          previousStatusesRef.current.set(recipeId, currentStatus);
          onStatusChange?.(recipeId, currentStatus, updatedRecipe);
          lastProgressAtRef.current.set(recipeId, Date.now());
        }

        // Stop polling if terminal status reached
        if (isTerminalStatus(currentStatus)) {
          stopPolling(recipeId);
          return;
        }

        // Fail item if no progress for NO_PROGRESS_TIMEOUT_MS
        const lastProgressAt =
          lastProgressAtRef.current.get(recipeId) || Date.now();
        const now = Date.now();
        if (
          !isTerminalStatus(currentStatus) &&
          now - lastProgressAt >= NO_PROGRESS_TIMEOUT_MS
        ) {
          stopPolling(recipeId);
          const failedRecipe: InstagramRecipePost = {
            ...updatedRecipe,
            status: "failed",
            error: updatedRecipe.error || "No progress for 60 seconds",
          } as InstagramRecipePost;
          onStatusChange?.(recipeId, "failed", failedRecipe);
          onPollingStop?.(recipeId);
          return;
        }

        // Reset poll interval if status changed (progress was made)
        if (previousStatus !== currentStatus) {
          resetPollInterval(recipeId);
        }

        // Schedule next poll with exponential backoff
        const nextInterval = getNextPollInterval(recipeId);
        const timeout = setTimeout(() => {
          pollRecipe(recipeId);
        }, nextInterval);

        pollTimeoutsRef.current.set(recipeId, timeout);
      } catch (error) {
        const errorCount =
          (consecutiveErrorsRef.current.get(recipeId) || 0) + 1;
        consecutiveErrorsRef.current.set(recipeId, errorCount);

        const err =
          error instanceof Error ? error : new Error("Unknown polling error");
        onError?.(recipeId, err);

        // Fail item if no progress for NO_PROGRESS_TIMEOUT_MS even on errors
        const lastProgressAt =
          lastProgressAtRef.current.get(recipeId) || Date.now();
        const now = Date.now();
        if (now - lastProgressAt >= NO_PROGRESS_TIMEOUT_MS) {
          stopPolling(recipeId);
          const failedRecipe: InstagramRecipePost = {
            id: recipeId,
            status: "failed",
            error: err.message || "Polling error",
          } as InstagramRecipePost;
          onStatusChange?.(recipeId, "failed", failedRecipe);
          onPollingStop?.(recipeId);
          return;
        }

        // Continue polling with exponential backoff even on error
        const nextInterval = getNextPollInterval(recipeId);
        const timeout = setTimeout(() => {
          pollRecipe(recipeId);
        }, nextInterval);

        pollTimeoutsRef.current.set(recipeId, timeout);
      }
    },
    [
      onStatusChange,
      onError,
      isTerminalStatus,
      stopPolling,
      resetPollInterval,
      getNextPollInterval,
      onPollingStop,
    ]
  );

  const startPolling = useCallback(
    (recipeId: string, status?: RecipeStatus) => {
      // Don't poll if already polling or if terminal status
      if (
        pollTimeoutsRef.current.has(recipeId) ||
        activePollingRef.current.has(recipeId) ||
        isTerminalStatus(status)
      ) {
        return;
      }

      // Initialize status tracking
      if (status) {
        previousStatusesRef.current.set(recipeId, status);
      }

      // Initialize last progress timestamp and mark active
      lastProgressAtRef.current.set(recipeId, Date.now());
      activePollingRef.current.add(recipeId);

      // Start polling immediately
      pollRecipe(recipeId);
    },
    [isTerminalStatus, pollRecipe]
  );

  // Effect to manage polling for queue items that should be polled
  useEffect(() => {
    if (!enabled) {
      // Stop all polling if disabled
      pollTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      pollTimeoutsRef.current.clear();
      pollIntervalsRef.current.clear();
      consecutiveErrorsRef.current.clear();
      return;
    }

    // Stop polling for items removed from the queue
    const currentIds = new Set(queueItems.map((i) => i.id));
    Array.from(pollTimeoutsRef.current.keys()).forEach((id) => {
      if (!currentIds.has(id)) {
        stopPolling(id);
      }
    });

    // Start polling for items marked for polling
    queueItems.forEach((item) => {
      if (item.isPolling && !isTerminalStatus(item.status)) {
        startPolling(item.id, item.status);
      } else if (!item.isPolling || isTerminalStatus(item.status)) {
        // Stop polling if not marked for polling or reached terminal status
        stopPolling(item.id);
        if (isTerminalStatus(item.status)) {
          onPollingStop?.(item.id);
        }
      }
    });
  }, [
    queueItems,
    enabled,
    startPolling,
    stopPolling,
    isTerminalStatus,
    onPollingStop,
  ]);

  // Clear all timers on unmount only
  useEffect(() => {
    const timeouts = pollTimeoutsRef.current;
    const intervals = pollIntervalsRef.current;
    const errors = consecutiveErrorsRef.current;
    const prev = previousStatusesRef.current;
    const last = lastProgressAtRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
      intervals.clear();
      errors.clear();
      prev.clear();
      last.clear();
    };
  }, []);

  return {
    stopPolling,
  };
}
