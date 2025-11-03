'use client';

import Image from 'next/image';
import type { Recipe } from '@/types/recipe';

type RecipeCardProps = {
  recipe: Recipe;
  active?: boolean;
  onSelect?: (recipe: Recipe) => void;
};

export function RecipeCard({ recipe, active = false, onSelect }: RecipeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(recipe)}
      className={`w-full rounded-2xl border transition ${
        active
          ? 'border-accent bg-slate-900 shadow-lg shadow-accent/20'
          : 'border-slate-800 bg-slate-900/60 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10'
      }`}
    >
      <div className="flex items-start gap-4 p-4 text-left">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-800">
          {recipe.media.coverImage ? (
            <Image
              src={recipe.media.coverImage}
              alt={recipe.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-lg font-semibold text-white">{recipe.title}</h3>
          <p className="max-h-16 overflow-hidden text-ellipsis text-sm text-slate-300">
            {recipe.summary}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full bg-slate-800/80 px-2 py-1">
              {recipe.metadata.difficulty} • {recipe.metadata.prepTimeMinutes ?? '—'} min prep
            </span>
            <span>@{recipe.author.username}</span>
            <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide">
              {recipe.analysis.provider === 'gemini-structured' ? 'Gemini structured' : 'Heuristic'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
