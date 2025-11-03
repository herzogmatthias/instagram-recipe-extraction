import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { findRecipeById } from '@/lib/recipes';
import { MissingGeminiKeyError, runRecipeChat } from '@/lib/gemini';
import type { ChatRequestPayload } from '@/types/chat';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ChatRequestPayload;
    if (!payload?.recipeId || !payload?.messages?.length) {
      return NextResponse.json({ message: 'Recipe ID and at least one message are required.' }, { status: 400 });
    }

    const recipe = payload.recipe ?? (await findRecipeById(payload.recipeId));
    if (!recipe) {
      return NextResponse.json({ message: 'Recipe not found.' }, { status: 404 });
    }

    const answer = await runRecipeChat(recipe, payload.messages.map((message) => ({
      role: message.role,
      content: message.content
    })));

    return NextResponse.json({
      message: {
        id: randomUUID(),
        role: 'assistant',
        content: answer,
        createdAt: Date.now()
      }
    });
  } catch (error) {
    if (error instanceof MissingGeminiKeyError) {
      return NextResponse.json({
        message: error.message,
        requiresKey: true
      }, { status: 503 });
    }

    return NextResponse.json({ message: 'Gemini request failed.' }, { status: 500 });
  }
}
