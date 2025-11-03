import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Recipe } from '@/types/recipe';

const getModelName = () => process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

const formatIngredientLine = (
  ingredient: Recipe['ingredients'][number],
  index: number
): string => {
  const parts = [ingredient.quantity, ingredient.item, ingredient.notes].filter(Boolean);
  return `${index + 1}. ${parts.join(' - ')}`;
};

const formatInstructionLine = (instruction: Recipe['steps'][number], index: number): string => {
  const title = instruction.title ? `${instruction.title}: ` : '';
  return `${index + 1}. ${title}${instruction.instruction}`;
};

const buildRecipeContext = (recipe: Recipe): string => {
  const ingredientList = recipe.ingredients.map(formatIngredientLine).join('\n');
  const steps = recipe.steps.map(formatInstructionLine).join('\n');
  const tips = recipe.tips.length ? `\nTips:\n${recipe.tips.map((tip, index) => `${index + 1}. ${tip}`).join('\n')}` : '';
  const tools = recipe.tools.length ? `\nTools:\n${recipe.tools.join(', ')}` : '';
  const metadata = `Difficulty: ${recipe.metadata.difficulty} | Prep: ${recipe.metadata.prepTimeMinutes ?? 'n/a'} min | Cook: ${
    recipe.metadata.cookTimeMinutes ?? 'n/a'
  } min | Servings: ${recipe.metadata.servings ?? 'n/a'}`;
  return `You are assisting a cook with the recipe "${recipe.title}".
Summary: ${recipe.summary}
${metadata}
Ingredients:\n${ingredientList}\nSteps:\n${steps}${tips}${tools}`;
};

export class MissingGeminiKeyError extends Error {
  constructor() {
    super('Missing Google API key. Provide GOOGLE_API_KEY to enable Gemini responses.');
    this.name = 'MissingGeminiKeyError';
  }
}

export interface StructuredRecipeIngredient {
  item: string;
  quantity?: string | null;
  notes?: string | null;
}

export interface StructuredRecipeInstruction {
  instruction: string;
  title?: string | null;
  durationMinutes?: number | null;
}

export interface StructuredRecipe {
  title: string;
  summary: string;
  difficulty?: Recipe['metadata']['difficulty'];
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  totalTimeMinutes?: number | null;
  servings?: number | null;
  tags: string[];
  tools: string[];
  tips: string[];
  ingredients: StructuredRecipeIngredient[];
  steps: StructuredRecipeInstruction[];
}

const structuredRecipeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: 'Clear recipe title the user can understand.' },
    summary: {
      type: SchemaType.STRING,
      description: '1-2 sentence overview explaining the dish and notable context.'
    },
    difficulty: {
      type: SchemaType.STRING,
      enum: ['Easy', 'Medium', 'Hard'],
      description: 'Relative difficulty for a home cook.'
    },
    prepTimeMinutes: { type: SchemaType.NUMBER, nullable: true },
    cookTimeMinutes: { type: SchemaType.NUMBER, nullable: true },
    totalTimeMinutes: { type: SchemaType.NUMBER, nullable: true },
    servings: { type: SchemaType.NUMBER, nullable: true },
    tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    tools: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    tips: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ['item'],
        properties: {
          item: { type: SchemaType.STRING },
          quantity: { type: SchemaType.STRING, nullable: true },
          notes: { type: SchemaType.STRING, nullable: true }
        }
      }
    },
    steps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ['instruction'],
        properties: {
          instruction: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING, nullable: true },
          durationMinutes: { type: SchemaType.NUMBER, nullable: true }
        }
      }
    }
  },
  required: ['title', 'summary', 'tags', 'tools', 'tips', 'ingredients', 'steps']
} as const;

export interface StructuredRecipeInput {
  caption: string;
  comments?: string[];
  titleHint?: string;
}

export const generateStructuredRecipe = async (
  input: StructuredRecipeInput
): Promise<{ recipe: StructuredRecipe; model: string }> => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new MissingGeminiKeyError();
  }

  const modelName = getModelName();
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: modelName });
  const commentsSection = input.comments?.length
    ? input.comments.map((comment, index) => `${index + 1}. ${comment}`).join('\n')
    : 'None provided.';
  const prompt = `You will receive raw Instagram recipe content (caption and optional comments).
Extract a structured recipe with normalized ingredient names, grouped instructions, helpful cooking tips, and core metadata.
Only infer values that are strongly supported by the content.
If specific fields like cook time or servings are not stated, return null for them.
Respond strictly as JSON following the provided schema.`;

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${prompt}\n\nCaption:\n${input.caption}\n\nTop comments:\n${commentsSection}\n\nTitle hint: ${
              input.titleHint ?? 'None'
            }`
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: structuredRecipeSchema,
      temperature: 0.35
    }
  });

  const text = result.response.text();
  if (!text) {
    throw new Error('Gemini returned an empty structured response.');
  }

  const recipeJson = JSON.parse(text) as StructuredRecipe;
  const recipe: StructuredRecipe = {
    ...recipeJson,
    tags: Array.isArray(recipeJson.tags) ? recipeJson.tags : [],
    tools: Array.isArray(recipeJson.tools) ? recipeJson.tools : [],
    tips: Array.isArray(recipeJson.tips) ? recipeJson.tips : [],
    ingredients: Array.isArray(recipeJson.ingredients) ? recipeJson.ingredients : [],
    steps: Array.isArray(recipeJson.steps) ? recipeJson.steps : []
  };

  return { recipe, model: modelName };
};

export const runRecipeChat = async (
  recipe: Recipe,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new MissingGeminiKeyError();
  }

  const modelName = getModelName();
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: modelName });

  const history = messages.slice(0, -1).map((message) => ({
    role: message.role,
    parts: [{ text: message.content }]
  }));

  const latestMessage = messages[messages.length - 1];
  const prompt = latestMessage?.content ?? '';

  const systemInstruction = `You are Gemini 2.5 Flash acting as a culinary assistant.
Use only the provided recipe data and prior conversation to answer.
Give concise, encouraging responses with numbered or bulleted steps when helpful.
If information is missing, acknowledge it and suggest sensible estimates.`;

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${systemInstruction}\n\nRecipe data:\n${buildRecipeContext(recipe)}\n\nConversation history:\n${history
              .map((message) => `${message.role}: ${message.parts[0]?.text ?? ''}`)
              .join('\n')}\n\nUser question: ${prompt}`
          }
        ]
      }
    ]
  });

  const text = result.response.text();
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }
  return text.trim();
};

export { getModelName };
