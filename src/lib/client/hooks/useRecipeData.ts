"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getClientFirestore } from "@/lib/client/firebase";
import type { InstagramRecipePost } from "@/models/InstagramRecipePost";

interface UseRecipeDataReturn {
  recipes: InstagramRecipePost[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useRecipeData(): UseRecipeDataReturn {
  const [recipes, setRecipes] = useState<InstagramRecipePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const db = getClientFirestore();
      const recipesRef = collection(db, "recipes");
      const recipesQuery = query(recipesRef, orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(
        recipesQuery,
        (snapshot) => {
          const mapped = snapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return normalizeRecipeDoc({ id: doc.id, ...data });
          }) as InstagramRecipePost[];
          setRecipes(mapped);
          setLoading(false);
          setError(null);
        },
        (err) => {
          setError(new Error(err.message));
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unable to connect to Firestore")
      );
      setLoading(false);
      return () => {};
    }
  }, []);

  const refetch = useCallback(async () => {
    // Firestore listeners keep data fresh; refetch is a no-op for compatibility.
    return Promise.resolve();
  }, []);

  return {
    recipes,
    loading,
    error,
    refetch,
  };
}

function normalizeRecipeDoc(doc: Record<string, unknown>): InstagramRecipePost {
  const createdAt = toIsoString(doc.createdAt);
  const updatedAt = toIsoString(doc.updatedAt);

  return {
    ...(doc as InstagramRecipePost),
    id: typeof doc.id === "string" ? doc.id : "",
    createdAt: createdAt ?? (doc.timestamp as string | undefined),
    updatedAt: updatedAt ?? undefined,
    status: (doc.status as RecipeStatus | undefined) ?? "ready",
    progress: typeof doc.progress === "number" ? doc.progress : 100,
  };
}

type RecipeStatus = InstagramRecipePost["status"];

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (
    typeof value === "object" &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}
