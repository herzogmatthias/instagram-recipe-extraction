'use client';

import Link from 'next/link';
import type { Recipe } from '@/types/recipe';

interface RecipeDetailProps {
  recipe: Recipe | null;
}

export function RecipeDetail({ recipe }: RecipeDetailProps) {
  if (!recipe) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-400">
        <p>Choose a recipe to see the extracted ingredients, steps and nutrition information.</p>
      </div>
    );
  }

  const { metadata } = recipe;

  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
          <span>{recipe.analysis.provider === 'gemini-structured' ? 'Gemini structured output' : 'Heuristic extraction'}</span>
          {recipe.analysis.model ? <span className="text-slate-500">{recipe.analysis.model}</span> : null}
        </div>
        <h2 className="text-2xl font-semibold text-white">{recipe.title}</h2>
        <p className="text-sm text-slate-300">{recipe.summary}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link
            href={recipe.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
          >
            View Instagram Post
          </Link>
          <span>• @{recipe.author.username}</span>
          <span>
            Difficulty: <span className="text-slate-200">{metadata.difficulty}</span>
          </span>
          <span>
            Prep: <span className="text-slate-200">{metadata.prepTimeMinutes ?? '—'} min</span>
          </span>
          <span>
            Cook: <span className="text-slate-200">{metadata.cookTimeMinutes ?? '—'} min</span>
          </span>
          <span>
            Total: <span className="text-slate-200">{metadata.totalTimeMinutes ?? '—'} min</span>
          </span>
          <span>
            Servings: <span className="text-slate-200">{metadata.servings ?? '—'}</span>
          </span>
        </div>
      </header>
      <section>
        <h3 className="text-lg font-semibold text-white">Ingredients</h3>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-200">
          {recipe.ingredients.map((item) => (
            <li key={`${item.item}-${item.quantity ?? 'quantity'}`} className="leading-relaxed">
              <span className="font-medium text-slate-100">{item.quantity ? `${item.quantity} ` : ''}</span>
              <span>{item.item}</span>
              {item.notes ? <span className="text-slate-400"> — {item.notes}</span> : null}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-lg font-semibold text-white">Steps</h3>
        <ol className="mt-2 space-y-3 text-sm text-slate-200">
          {recipe.steps.map((step, index) => (
            <li key={`${index}-${step.instruction.slice(0, 12)}`} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              {step.title ? <p className="text-sm font-semibold text-slate-100">{step.title}</p> : null}
              <p className="leading-relaxed">{step.instruction}</p>
              {typeof step.durationMinutes === 'number' ? (
                <p className="text-xs text-slate-400">Estimated time: {step.durationMinutes} min</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
      {recipe.tips.length ? (
        <section>
          <h3 className="text-lg font-semibold text-white">Tips from Gemini</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {recipe.tips.map((tip, index) => (
              <li key={`${index}-${tip.slice(0, 12)}`} className="rounded-xl border border-accent/30 bg-accent/5 p-3">
                {tip}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {recipe.tools.length ? (
        <section>
          <h3 className="text-lg font-semibold text-white">Suggested tools</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-accent">
            {recipe.tools.map((tool) => (
              <span key={tool} className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1">
                {tool}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {recipe.tags.length ? (
        <section>
          <h3 className="text-lg font-semibold text-white">Tags</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-accent">
            {recipe.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1">
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <section className="mt-auto">
        <h3 className="text-lg font-semibold text-white">Post metrics</h3>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-slate-300 md:grid-cols-4">
          <Metric label="Likes" value={metadata.likes ?? '—'} />
          <Metric label="Comments" value={metadata.comments ?? '—'} />
          <Metric label="Views" value={metadata.views ?? '—'} />
          <Metric label="Duration" value={metadata.durationSeconds ? `${metadata.durationSeconds}s` : '—'} />
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-center">
      <span className="block text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-lg font-semibold text-white">{value}</span>
    </div>
  );
}
