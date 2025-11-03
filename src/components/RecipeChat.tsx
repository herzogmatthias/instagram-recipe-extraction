'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api';
import type { ChatMessage, ChatResponsePayload } from '@/types/chat';
import type { Recipe } from '@/types/recipe';

interface RecipeChatProps {
  recipe: Recipe | null;
}

const CHAT_HISTORY_KEY = 'recipe-studio.chat-history.v1';

const assistantIntro = (recipe: Recipe) =>
  `Hi! I'm your Gemini sous-chef for ${recipe.title}. Ask me anything about the ingredients, substitutions or cooking steps.`;

const loadHistory = (recipeId: string): ChatMessage[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Record<string, ChatMessage[]>;
    return Array.isArray(parsed?.[recipeId]) ? parsed[recipeId] : [];
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to read chat history', error);
    }
    return [];
  }
};

const persistHistory = (recipeId: string, history: ChatMessage[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {};
    parsed[recipeId] = history;
    window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(parsed));
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to persist chat history', error);
    }
  }
};

export function RecipeChat({ recipe }: RecipeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipe) {
      setMessages([]);
      setInput('');
      setError(null);
      return;
    }
    const history = loadHistory(recipe.id);
    setMessages(history);
    setInput('');
    setError(null);
  }, [recipe]);

  useEffect(() => {
    if (!recipe) {
      return;
    }
    persistHistory(recipe.id, messages);
  }, [messages, recipe]);

  const derivedMessages = useMemo(() => {
    if (!recipe) {
      return [] as ChatMessage[];
    }
    const base: ChatMessage[] = [
      {
        id: `assistant-intro-${recipe.id}`,
        role: 'assistant',
        content: assistantIntro(recipe),
        createdAt: Date.now()
      }
    ];
    return [...base, ...messages];
  }, [messages, recipe]);

  const handleSend = async () => {
    if (!recipe || !input.trim()) {
      return;
    }
    setError(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: Date.now()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const payload = await apiClient.post<ChatResponsePayload>('/api/chat', {
        recipeId: recipe.id,
        recipe,
        messages: [...messages, userMessage].map((message) => ({
          role: message.role,
          content: message.content
        }))
      });

      const assistantMessage: ChatMessage = {
        ...payload.message,
        id: payload.message.id ?? `assistant-${Date.now()}`,
        createdAt: payload.message.createdAt ?? Date.now()
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (chatError) {
      if (chatError instanceof ApiError) {
        const requiresKey = typeof chatError.body === 'object' && chatError.body !== null && 'requiresKey' in chatError.body;
        const message =
          (typeof chatError.body === 'object' && chatError.body !== null && 'message' in chatError.body
            ? String((chatError.body as { message?: string }).message)
            : undefined) ?? chatError.message;
        setError(
          requiresKey
            ? `${message} Add your GOOGLE_API_KEY in .env.local to enable Gemini.`
            : message ?? 'Unknown error.'
        );
      } else {
        setError(chatError instanceof Error ? chatError.message : 'Unknown error.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!recipe) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-400">
        <p>Select a recipe to start chatting with Gemini.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60">
      <header className="border-b border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-white">Gemini Sous-Chef</h2>
        <p className="text-sm text-slate-400">Ask follow-up questions, get substitutions or step-by-step guidance.</p>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {derivedMessages.map((message) => (
          <div
            key={message.id}
            className={`max-w-xl rounded-2xl px-4 py-2 text-sm ${
              message.role === 'assistant'
                ? 'bg-slate-800 text-slate-100'
                : 'ml-auto bg-accent text-slate-950'
            }`}
          >
            {message.content}
          </div>
        ))}
        {isLoading ? <div className="text-xs text-slate-400">Gemini is thinking...</div> : null}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-3 border-t border-slate-800 p-4"
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about the recipe..."
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {error ? <div className="border-t border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}
    </div>
  );
}
