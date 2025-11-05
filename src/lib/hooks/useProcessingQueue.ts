"use client";

import React, {
  useState,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  InstagramRecipePost,
  RecipeStatus,
} from "@/models/InstagramRecipePost";

export interface QueueItem {
  id: string;
  url: string;
  status: RecipeStatus;
  progress: number;
  createdAt: string;
  displayUrl?: string | null;
  title?: string;
  error?: string;
  isPolling: boolean;
}

interface UseProcessingQueueReturn {
  queue: QueueItem[];
  addToQueue: (recipe: InstagramRecipePost) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, updates: Partial<QueueItem>) => void;
  startPolling: (id: string) => void;
  stopPolling: (id: string) => void;
  isInQueue: (id: string) => boolean;
}

const TERMINAL_STATUSES: RecipeStatus[] = ["ready", "failed"];
const MAX_QUEUE_SIZE = 3;

const ProcessingQueueContext = createContext<UseProcessingQueueReturn | null>(
  null
);

export function ProcessingQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const addToQueue = useCallback((recipe: InstagramRecipePost) => {
    setQueue((prev) => {
      if (prev.find((item) => item.id === recipe.id)) {
        return prev;
      }

      const newItem: QueueItem = {
        id: recipe.id,
        url: recipe.inputUrl || recipe.url,
        status: recipe.status || "queued",
        progress: recipe.progress || 0,
        createdAt: recipe.createdAt || recipe.timestamp,
        displayUrl: recipe.displayUrl,
        title: recipe.recipe_data?.title,
        error: recipe.error,
        isPolling: true,
      };

      const updated = [newItem, ...prev];
      // Enforce last three items max (newest first)
      return updated.slice(0, MAX_QUEUE_SIZE);
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQueueItem = useCallback(
    (id: string, updates: Partial<QueueItem>) => {
      setQueue((prev) => {
        const index = prev.findIndex((item) => item.id === id);
        if (index === -1) return prev;

        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };

        // If status changed to terminal, stop polling but DO NOT auto-remove
        if (updates.status && TERMINAL_STATUSES.includes(updates.status)) {
          updated[index].isPolling = false;
        }

        return updated;
      });
    },
    []
  );

  const startPolling = useCallback(
    (id: string) => {
      updateQueueItem(id, { isPolling: true });
    },
    [updateQueueItem]
  );

  const stopPolling = useCallback(
    (id: string) => {
      updateQueueItem(id, { isPolling: false });
    },
    [updateQueueItem]
  );

  const isInQueue = useCallback(
    (id: string) => {
      return queue.some((item) => item.id === id);
    },
    [queue]
  );

  const value: UseProcessingQueueReturn = {
    queue,
    addToQueue,
    removeFromQueue,
    updateQueueItem,
    startPolling,
    stopPolling,
    isInQueue,
  };

  return React.createElement(
    ProcessingQueueContext.Provider,
    { value },
    children
  );
}

export function useProcessingQueue(): UseProcessingQueueReturn {
  const ctx = useContext(ProcessingQueueContext);
  if (!ctx) {
    throw new Error(
      "useProcessingQueue must be used within a ProcessingQueueProvider"
    );
  }
  return ctx;
}
