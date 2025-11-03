'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import type { Recipe } from '@/types/recipe';

interface AddRecipeFormProps {
  onRecipeCreated: (recipe: Recipe) => void;
}

const initialState = {
  link: '',
  caption: '',
  coverImage: '',
  videoUrl: '',
  username: '',
  name: ''
};

export function AddRecipeForm({ onRecipeCreated }: AddRecipeFormProps) {
  const [form, setForm] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.link || !form.caption) {
      setError('Please provide at least a link and the caption or recipe description.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = await apiClient.post<{ recipe: Recipe; notice?: string }>('/api/recipes', {
        link: form.link,
        caption: form.caption,
        coverImage: form.coverImage || undefined,
        videoUrl: form.videoUrl || undefined,
        author: {
          username: form.username || undefined,
          name: form.name || undefined
        }
      });
      onRecipeCreated(payload.recipe);
      setNotice(payload.notice ?? null);
      setForm(initialState);
    } catch (submissionError) {
      setNotice(null);
      setError(submissionError instanceof Error ? submissionError.message : 'Unknown error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner shadow-black/20"
    >
      <h2 className="text-lg font-semibold text-white">Add your own recipe link</h2>
      <p className="text-sm text-slate-400">
        Paste an Instagram link with the caption content. We simulate the extraction by running Gemini structured output on your
        provided text. Custom recipes stay in your browser for now.
      </p>
      <label className="text-sm font-medium text-slate-200" htmlFor="recipe-link">
        Instagram Link
      </label>
      <input
        id="recipe-link"
        type="url"
        required
        value={form.link}
        onChange={(event) => updateField('link', event.target.value)}
        className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-accent"
        placeholder="https://www.instagram.com/reel/..."
      />
      <label className="text-sm font-medium text-slate-200" htmlFor="recipe-caption">
        Caption or recipe description
      </label>
      <textarea
        id="recipe-caption"
        required
        rows={6}
        value={form.caption}
        onChange={(event) => updateField('caption', event.target.value)}
        className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-accent"
        placeholder="Copy the post caption so we can extract ingredients and steps"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-200" htmlFor="recipe-cover">
            Cover image URL (optional)
          </label>
          <input
            id="recipe-cover"
            type="url"
            value={form.coverImage}
            onChange={(event) => updateField('coverImage', event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            placeholder="https://...jpg"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-200" htmlFor="recipe-video">
            Video URL (optional)
          </label>
          <input
            id="recipe-video"
            type="url"
            value={form.videoUrl}
            onChange={(event) => updateField('videoUrl', event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            placeholder="https://...mp4"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-200" htmlFor="recipe-username">
            Creator username (optional)
          </label>
          <input
            id="recipe-username"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            placeholder="@yourfavouritechef"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-200" htmlFor="recipe-name">
            Creator name (optional)
          </label>
          <input
            id="recipe-name"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            placeholder="Jamie Oliver"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {notice ? <p className="text-sm text-amber-300/80">{notice}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Adding...' : 'Add recipe'}
      </button>
    </form>
  );
}
