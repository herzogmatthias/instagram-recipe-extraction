import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import * as React from 'react';
import type { StructuredRecipe } from '@/lib/gemini';
import type {
  InstagramPostRecord,
  Recipe,
  RecipeAnalysis,
  RecipeDraftInput,
  RecipeIngredient,
  RecipeInstruction
} from '@/types/recipe';

type CacheFunction = <T extends (...args: any[]) => any>(fn: T) => T;

const cache: CacheFunction = (React as { cache?: CacheFunction }).cache ?? ((fn) => fn);

const DATA_FILES = ['export_1762165645618.json', 'export_1762176390207.json'];
const DATA_DIRECTORY = path.join(process.cwd(), 'data');

const LIST_DELIMITERS = ['•', '-', '–', '—'];
const INGREDIENT_KEYWORDS = ['tbsp', 'tsp', 'cup', 'cups', 'g', 'gram', 'ml', 'kg', 'lb', 'oz'];
const SERVINGS_REGEX = /(serves|servings|portion|portions|people)\s*(\d{1,2})/i;

const fallbackAuthor = {
  username: 'community-chef',
  name: 'Community Submission'
};

const createAnalysis = (provider: RecipeAnalysis['provider'], model?: string): RecipeAnalysis => ({
  provider,
  model,
  generatedAt: new Date().toISOString()
});

const sanitizeNumber = (value: string): number | null => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  if (!cleaned) {
    return null;
  }
  const numeric = Number.parseFloat(cleaned);
  return Number.isNaN(numeric) ? null : numeric;
};

const deriveTitle = (caption: string): string => {
  const firstLine = caption
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstLine ?? 'Instagram Recipe';
};

const deriveSummary = (caption: string): string => {
  const paragraphs = caption
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return 'Recipe extracted from Instagram post.';
  }

  const firstParagraph = paragraphs[0];
  return firstParagraph.length > 220 ? `${firstParagraph.slice(0, 217)}...` : firstParagraph;
};

export const extractLines = (caption: string): string[] =>
  caption
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const looksLikeIngredient = (line: string): boolean => {
  if (line.toLowerCase().startsWith('step')) {
    return false;
  }
  if (/\d/.test(line)) {
    return true;
  }
  return INGREDIENT_KEYWORDS.some((keyword) => line.toLowerCase().includes(keyword));
};

const looksLikeInstruction = (line: string): boolean => {
  const lower = line.toLowerCase();
  if (looksLikeIngredient(line)) {
    return false;
  }
  if (lower.startsWith('step')) {
    return true;
  }
  return /\b(add|mix|stir|cook|bake|serve|pour|simmer|combine|nestle|remove|flip|bring|top|toast|saute|whisk)\b/.test(lower);
};

const deriveDifficulty = (ingredientsCount: number, stepsCount: number): Recipe['metadata']['difficulty'] => {
  if (ingredientsCount <= 8 && stepsCount <= 4) {
    return 'Easy';
  }
  if (ingredientsCount <= 15 && stepsCount <= 6) {
    return 'Medium';
  }
  return 'Hard';
};

const derivePrepTime = (caption: string): number | null => {
  const match = caption.match(/(\d{1,2})\s?(minutes|min|mins)/i);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  const ingredientLines = extractLines(caption).filter(looksLikeIngredient);
  if (ingredientLines.length === 0) {
    return null;
  }
  const base = 10 + ingredientLines.length * 3;
  return Math.max(base, 15);
};

const deriveServings = (caption: string): number | null => {
  const match = caption.match(SERVINGS_REGEX);
  if (match) {
    return Number.parseInt(match[2], 10);
  }
  return null;
};

const deriveTotalTime = (prep: number | null, cook: number | null): number | null => {
  if (typeof prep === 'number' && typeof cook === 'number') {
    return prep + cook;
  }
  return prep ?? cook ?? null;
};

export const normaliseLine = (line: string): string => {
  const withoutBullet = LIST_DELIMITERS.reduce(
    (acc, delimiter) => (acc.startsWith(delimiter) ? acc.substring(delimiter.length).trim() : acc),
    line
  );
  return withoutBullet.replace(/^[-*]\s*/, '').trim();
};

const parseIngredientLine = (line: string): RecipeIngredient => {
  const cleaned = line.replace(/^ingredients?:/i, '').trim();
  const match = cleaned.match(
    /^(?<quantity>[0-9¼½¾⅓⅔⅛⅜⅝⅞.,\s\/+-]+(?:[a-zA-Z%°]+\.?){0,1})\s+(?<item>.+)$/
  );
  if (match?.groups?.item) {
    const quantity = match.groups.quantity?.trim();
    const item = match.groups.item.trim();
    if (quantity && item) {
      return { item, quantity };
    }
  }
  return { item: cleaned };
};

export const extractIngredients = (caption: string): RecipeIngredient[] =>
  extractLines(caption)
    .filter(looksLikeIngredient)
    .map(normaliseLine)
    .map(parseIngredientLine)
    .filter((ingredient, index, array) =>
      array.findIndex((item) => `${item.item}|${item.quantity ?? ''}` === `${ingredient.item}|${ingredient.quantity ?? ''}`) === index
    );

export const extractInstructions = (caption: string): RecipeInstruction[] => {
  const instructions = extractLines(caption)
    .filter(looksLikeInstruction)
    .map(normaliseLine)
    .map((instruction) => ({ instruction } satisfies RecipeInstruction));

  if (instructions.length > 0) {
    return instructions;
  }

  return [
    {
      instruction: 'Review the ingredients, prepare them, and cook according to the video instructions.'
    }
  ];
};

const extractTags = (caption: string): string[] =>
  Array.from(new Set((caption.match(/#[\w-]+/g) ?? []).map((tag) => tag.toLowerCase())));

const extractTips = (caption: string): string[] =>
  extractLines(caption)
    .filter((line) => /tip:|pro tip|chef'?s tip/i.test(line))
    .map((line) => line.replace(/^(pro\s+)?tip:?/i, '').trim())
    .filter(Boolean);

const createBaseRecipe = (
  {
    id,
    caption,
    title,
    author,
    postUrl,
    media,
    likes,
    comments,
    views,
    postedAt,
    durationSeconds
  }: {
    id: string;
    caption: string;
    title?: string;
    author: Recipe['author'];
    postUrl: string;
    media: Recipe['media'];
    likes: number | null;
    comments: number | null;
    views: number | null;
    postedAt: string;
    durationSeconds: number | null;
  }
): Recipe => {
  const ingredients = extractIngredients(caption);
  const steps = extractInstructions(caption);
  const prepTime = derivePrepTime(caption);
  const cookTime = null;
  const totalTime = deriveTotalTime(prepTime, cookTime);
  return {
    id,
    title: title ?? deriveTitle(caption),
    summary: deriveSummary(caption),
    author,
    postUrl,
    media: {
      coverImage: media.coverImage ?? '',
      videoUrl: media.videoUrl ?? ''
    },
    caption,
    ingredients,
    steps,
    tags: extractTags(caption),
    tips: extractTips(caption),
    tools: [],
    metadata: {
      likes,
      comments,
      views,
      postedAt,
      durationSeconds,
      difficulty: deriveDifficulty(ingredients.length, steps.length),
      prepTimeMinutes: prepTime,
      cookTimeMinutes: cookTime,
      totalTimeMinutes: totalTime,
      servings: deriveServings(caption)
    },
    analysis: createAnalysis('heuristic')
  };
};

const readDataFile = cache(async (fileName: string): Promise<InstagramPostRecord[]> => {
  const filePath = path.join(DATA_DIRECTORY, fileName);
  const file = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(file) as InstagramPostRecord[];
});

const getAllRecords = cache(async (): Promise<InstagramPostRecord[]> => {
  const records = await Promise.all(DATA_FILES.map((file) => readDataFile(file)));
  return records.flat();
});

export const getAllRecipes = cache(async (): Promise<Recipe[]> => {
  const records = await getAllRecords();
  return records.map(recipeFromRecord);
});

export const recipeFromRecord = (record: InstagramPostRecord): Recipe =>
  createBaseRecipe({
    id: record.id,
    caption: record.Caption ?? '',
    title: record.Caption ? deriveTitle(record.Caption) : undefined,
    author: {
      username: record['Author Username'],
      name: record['Author Full Name'],
      profileUrl: record['Author URL'],
      verified: record['Author Is Verified'].toLowerCase() === 'yes'
    },
    postUrl: record['Post URL'],
    media: {
      coverImage: record['Cover Image'],
      videoUrl: record['Image URL']
    },
    likes: sanitizeNumber(record['Like Count']),
    comments: sanitizeNumber(record['Comment Count']),
    views: sanitizeNumber(record['View Count']),
    postedAt: record['Posted At'],
    durationSeconds:
      typeof record.Duration === 'number'
        ? Math.round(record.Duration * 1000) / 1000
        : sanitizeNumber(String(record.Duration))
  });

export const findRecipeById = cache(async (id: string): Promise<Recipe | undefined> => {
  const recipes = await getAllRecipes();
  return recipes.find((recipe) => recipe.id === id);
});

export const findRecordByUrl = cache(async (url: string): Promise<InstagramPostRecord | undefined> => {
  const records = await getAllRecords();
  return records.find((record) => record['Post URL'] === url);
});

export const recipeFromDraft = (draft: RecipeDraftInput): Recipe => {
  const caption = draft.caption.trim();
  const id = randomUUID();
  return createBaseRecipe({
    id,
    caption,
    author: {
      username: draft.author?.username ?? fallbackAuthor.username,
      name: draft.author?.name ?? fallbackAuthor.name,
      profileUrl: draft.link,
      verified: false
    },
    title: deriveTitle(caption),
    postUrl: draft.link,
    media: {
      coverImage: draft.coverImage ?? '',
      videoUrl: draft.videoUrl ?? ''
    },
    likes: null,
    comments: null,
    views: null,
    postedAt: new Date().toISOString(),
    durationSeconds: null
  });
};

const mapStructuredIngredients = (items: StructuredRecipe['ingredients']): RecipeIngredient[] =>
  items.map((item) => ({
    item: item.item.trim(),
    quantity: item.quantity?.trim() ?? null,
    notes: item.notes?.trim() ?? null
  }));

const mapStructuredInstructions = (steps: StructuredRecipe['steps']): RecipeInstruction[] =>
  steps.map((step) => ({
    title: step.title?.trim() ?? null,
    instruction: step.instruction.trim(),
    durationMinutes: typeof step.durationMinutes === 'number' ? step.durationMinutes : null
  }));

export const mergeRecipeWithStructured = (
  recipe: Recipe,
  structured: StructuredRecipe,
  model: string
): Recipe => {
  const merged: Recipe = {
    ...recipe,
    title: structured.title?.trim() || recipe.title,
    summary: structured.summary?.trim() || recipe.summary,
    ingredients:
      structured.ingredients?.length > 0
        ? mapStructuredIngredients(structured.ingredients)
        : recipe.ingredients,
    steps: structured.steps?.length > 0 ? mapStructuredInstructions(structured.steps) : recipe.steps,
    tags: structured.tags?.length ? Array.from(new Set([...recipe.tags, ...structured.tags])) : recipe.tags,
    tips: structured.tips?.length ? structured.tips : recipe.tips,
    tools: structured.tools?.length ? structured.tools : recipe.tools,
    metadata: {
      ...recipe.metadata,
      difficulty: structured.difficulty ?? recipe.metadata.difficulty,
      prepTimeMinutes:
        typeof structured.prepTimeMinutes === 'number' ? structured.prepTimeMinutes : recipe.metadata.prepTimeMinutes,
      cookTimeMinutes:
        typeof structured.cookTimeMinutes === 'number' ? structured.cookTimeMinutes : recipe.metadata.cookTimeMinutes,
      totalTimeMinutes:
        typeof structured.totalTimeMinutes === 'number'
          ? structured.totalTimeMinutes
          : deriveTotalTime(
              typeof structured.prepTimeMinutes === 'number' ? structured.prepTimeMinutes : recipe.metadata.prepTimeMinutes,
              typeof structured.cookTimeMinutes === 'number' ? structured.cookTimeMinutes : recipe.metadata.cookTimeMinutes
            ),
      servings: typeof structured.servings === 'number' ? structured.servings : recipe.metadata.servings
    },
    analysis: createAnalysis('gemini-structured', model)
  };

  return merged;
};
