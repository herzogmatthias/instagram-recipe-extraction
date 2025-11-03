'use client';

import { useEffect, useMemo, useState } from 'react';
import { AddRecipeForm } from '@/components/AddRecipeForm';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeChat } from '@/components/RecipeChat';
import { RecipeDetail } from '@/components/RecipeDetail';
import type { Recipe } from '@/types/recipe';

type DifficultyFilter = 'All' | 'Easy' | 'Medium' | 'Hard';

interface RecipeWorkspaceProps {
  initialRecipes: Recipe[];
}

const CUSTOM_RECIPES_KEY = 'recipe-studio.custom-recipes.v1';
const ACTIVE_RECIPE_KEY = 'recipe-studio.active-recipe.v1';

export function RecipeWorkspace({ initialRecipes }: RecipeWorkspaceProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(initialRecipes[0] ?? null);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('All');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isHydrated) {
      return;
    }
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(CUSTOM_RECIPES_KEY) : null;
      const storedActive = typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_RECIPE_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored) as Recipe[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecipes((prev) => {
            const initialIds = new Set(prev.map((recipe) => recipe.id));
            const dedupedCustom = parsed.filter((recipe) => !initialIds.has(recipe.id));
            return [...dedupedCustom, ...prev];
          });
        }
        if (storedActive) {
          const existingCustom = parsed.find((recipe) => recipe.id === storedActive);
          const existingInitial = initialRecipes.find((recipe) => recipe.id === storedActive);
          if (existingCustom) {
            setActiveRecipe(existingCustom);
          } else if (existingInitial) {
            setActiveRecipe(existingInitial);
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to hydrate custom recipes', error);
      }
    } finally {
      setIsHydrated(true);
    }
  }, [initialRecipes, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    const initialIds = new Set(initialRecipes.map((recipe) => recipe.id));
    const customRecipes = recipes.filter((recipe) => !initialIds.has(recipe.id));
    try {
      window.localStorage.setItem(CUSTOM_RECIPES_KEY, JSON.stringify(customRecipes));
      if (activeRecipe) {
        window.localStorage.setItem(ACTIVE_RECIPE_KEY, activeRecipe.id);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to persist custom recipes', error);
      }
    }
  }, [activeRecipe, initialRecipes, isHydrated, recipes]);

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const matchesDifficulty = difficulty === 'All' || recipe.metadata.difficulty === difficulty;
      const matchesSearch =
        !normalizedSearch ||
        recipe.title.toLowerCase().includes(normalizedSearch) ||
        recipe.summary.toLowerCase().includes(normalizedSearch) ||
        recipe.tags.some((tag) => tag.includes(normalizedSearch)) ||
        recipe.ingredients.some((ingredient) => ingredient.item.toLowerCase().includes(normalizedSearch));
      return matchesDifficulty && matchesSearch;
    });
  }, [difficulty, recipes, searchTerm]);

  const handleRecipeCreated = (recipe: Recipe) => {
    setRecipes((prev) => {
      const next = [recipe, ...prev.filter((existing) => existing.id !== recipe.id)];
      return next;
    });
    setActiveRecipe(recipe);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner shadow-black/10 lg:grid-cols-[320px_1fr_420px] lg:gap-6">
        <div className="flex h-full flex-col gap-4">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Recipe library</h2>
            <input
              type="search"
              placeholder="Search by ingredient or title"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              {(['All', 'Easy', 'Medium', 'Hard'] satisfies DifficultyFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDifficulty(option)}
                  className={`rounded-full border px-3 py-1 transition ${
                    difficulty === option
                      ? 'border-accent bg-accent text-slate-950'
                      : 'border-slate-700 text-slate-300 hover:border-accent/60 hover:text-white'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                active={activeRecipe?.id === recipe.id}
                onSelect={setActiveRecipe}
              />
            ))}
            {filteredRecipes.length === 0 ? (
              <p className="text-sm text-slate-400">No recipes match your filters yet.</p>
            ) : null}
          </div>
        </div>
        <RecipeDetail recipe={activeRecipe} />
        <RecipeChat recipe={activeRecipe} />
      </section>
      <AddRecipeForm onRecipeCreated={handleRecipeCreated} />
    </div>
  );
}
