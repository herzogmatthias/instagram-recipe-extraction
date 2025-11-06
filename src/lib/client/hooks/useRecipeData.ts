"use client";

import { useState, useEffect } from "react";
import { InstagramRecipePost } from "@/models/InstagramRecipePost";

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

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/recipes");

      if (!response.ok) {
        throw new Error(`Failed to fetch recipes: ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid data format: expected an array");
      }

      setRecipes(data);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  return {
    recipes,
    loading,
    error,
    refetch: loadRecipes,
  };
}
