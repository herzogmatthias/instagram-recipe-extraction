"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getClientFirestore } from "@/lib/client/firebase";
import type { RecipeStatus } from "@/models/InstagramRecipePost";
import type { RecipeImportDocument } from "@/models/RecipeImport";

export interface QueueItem {
  id: string;
  url: string;
  username: string;
  status: RecipeStatus;
  stage: RecipeStatus;
  progress: number;
  createdAt: string;
  displayUrl?: string | null;
  title?: string;
  error?: string | null;
  recipeId?: string;
}

interface UseProcessingQueueReturn {
  queue: QueueItem[];
  addToQueue: (importDoc: RecipeImportDocument) => void;
  removeFromQueue: (id: string) => void;
  isInQueue: (id: string) => boolean;
}

const MAX_QUEUE_SIZE = 3;

const ProcessingQueueContext = createContext<UseProcessingQueueReturn | null>(
  null
);

export function ProcessingQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const listenerMap = useRef<Map<string, Unsubscribe>>(new Map());
  const firestoreRef = useRef<ReturnType<typeof getClientFirestore>>();

  const ensureFirestore = useCallback(() => {
    if (firestoreRef.current) {
      return firestoreRef.current;
    }
    firestoreRef.current = getClientFirestore();
    return firestoreRef.current;
  }, []);

  const detachListener = useCallback((importId: string) => {
    const unsubscribe = listenerMap.current.get(importId);
    if (unsubscribe) {
      unsubscribe();
      listenerMap.current.delete(importId);
    }
  }, []);

  const attachListener = useCallback(
    (importId: string) => {
      if (listenerMap.current.has(importId)) {
        return;
      }

      try {
        const db = ensureFirestore();
        const importRef = doc(db, "imports", importId);
        const unsubscribe = onSnapshot(
          importRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setQueue((prev) => prev.filter((item) => item.id !== importId));
              detachListener(importId);
              return;
            }

            const data = snapshot.data() as Record<string, unknown>;
            setQueue((prev) =>
              prev.map((item) =>
                item.id === importId
                  ? {
                      ...item,
                      status:
                        (data.status as RecipeStatus) ??
                        item.status ??
                        "queued",
                      stage:
                        (data.stage as RecipeStatus | undefined) ?? item.stage,
                      progress:
                        typeof data.progress === "number"
                          ? data.progress
                          : item.progress,
                      recipeId:
                        typeof data.recipeId === "string"
                          ? data.recipeId
                          : item.recipeId,
                      error:
                        typeof data.error === "string" || data.error === null
                          ? (data.error as string | null)
                          : item.error,
                    }
                  : item
              )
            );
          },
          (error) => {
            console.error(
              `[queue] Failed to listen to import ${importId}`,
              error
            );
          }
        );
        listenerMap.current.set(importId, unsubscribe);
      } catch (error) {
        console.error("[queue] Unable to start Firestore listener", error);
      }
    },
    [detachListener, ensureFirestore]
  );

  const addToQueue = useCallback(
    (importDoc: RecipeImportDocument) => {
      setQueue((prev) => {
        if (prev.find((item) => item.id === importDoc.id)) {
          return prev;
        }

        const username =
          typeof importDoc.metadata?.username === "string"
            ? importDoc.metadata.username
            : "";

        const newItem: QueueItem = {
          id: importDoc.id,
          url: importDoc.inputUrl,
          username,
          status: importDoc.status,
          stage: importDoc.stage as RecipeStatus,
          progress: importDoc.progress ?? 0,
          createdAt: importDoc.createdAt ?? new Date().toISOString(),
          error: importDoc.error ?? null,
          recipeId: importDoc.recipeId ?? undefined,
        };

        const updated = [newItem, ...prev];
        const trimmed = updated.slice(0, MAX_QUEUE_SIZE);
        const removed = updated.slice(MAX_QUEUE_SIZE);
        removed.forEach((item) => detachListener(item.id));
        return trimmed;
      });
      attachListener(importDoc.id);
    },
    [attachListener, detachListener]
  );

  const removeFromQueue = useCallback(
    (id: string) => {
      detachListener(id);
      setQueue((prev) => prev.filter((item) => item.id !== id));
    },
    [detachListener]
  );

  const isInQueue = useCallback(
    (id: string) => queue.some((item) => item.id === id),
    [queue]
  );

  useEffect(() => {
    return () => {
      listenerMap.current.forEach((unsubscribe) => unsubscribe());
      listenerMap.current.clear();
    };
  }, []);

  const value: UseProcessingQueueReturn = {
    queue,
    addToQueue,
    removeFromQueue,
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
