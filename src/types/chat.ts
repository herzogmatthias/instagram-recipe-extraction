import type { Recipe } from '@/types/recipe';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

export interface ChatRequestPayload {
  recipeId: string;
  recipe?: Recipe;
  messages: Array<Omit<ChatMessage, 'id' | 'createdAt'>>;
}

export interface ChatResponsePayload {
  message: ChatMessage;
}
