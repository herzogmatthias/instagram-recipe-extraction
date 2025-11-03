import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { findRecordByUrl, getAllRecipes, mergeRecipeWithStructured, recipeFromDraft, recipeFromRecord } from '@/lib/recipes';
import { generateStructuredRecipe, MissingGeminiKeyError } from '@/lib/gemini';
import type { RecipeDraftInput } from '@/types/recipe';

export async function GET() {
  const recipes = await getAllRecipes();
  return NextResponse.json({ recipes });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as RecipeDraftInput;
  if (!payload?.link || !payload?.caption) {
    return NextResponse.json({ message: 'Link and caption are required.' }, { status: 400 });
  }

  const caption = payload.caption.trim();
  if (!caption) {
    return NextResponse.json({ message: 'Caption must include recipe text for extraction.' }, { status: 400 });
  }

  const record = await findRecordByUrl(payload.link);
  let baseRecipe = recipeFromDraft({ ...payload, caption });

  if (record) {
    const recordRecipe = recipeFromRecord({ ...record, Caption: caption });
    baseRecipe = {
      ...recordRecipe,
      id: randomUUID(),
      postUrl: payload.link
    };
  }

  let recipe = baseRecipe;
  let notice: string | undefined;

  try {
    const { recipe: structured, model } = await generateStructuredRecipe({
      caption,
      titleHint: baseRecipe.title
    });
    recipe = mergeRecipeWithStructured(baseRecipe, structured, model);
  } catch (error) {
    if (error instanceof MissingGeminiKeyError) {
      notice = error.message;
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Gemini structured extraction failed', error);
      }
      notice = 'Gemini structured extraction failed. Showing heuristic parse instead.';
    }
  }

  return NextResponse.json({ recipe, notice });
}
