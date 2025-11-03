import { describe, expect, it } from 'vitest';
import { mergeRecipeWithStructured, normaliseLine, extractIngredients } from './recipes';
import type { Recipe } from '../types/recipe';

const baseRecipe: Recipe = {
  id: 'test-recipe',
  title: 'Test Recipe',
  summary: 'A simple test summary.',
  author: {
    username: 'tester',
    name: 'Test Author',
    profileUrl: 'https://instagram.com/tester',
    verified: false
  },
  postUrl: 'https://instagram.com/p/test',
  media: {
    coverImage: '',
    videoUrl: ''
  },
  caption: '1 cup Flour\n2 Eggs\nMix and bake',
  ingredients: [
    { item: 'Flour', quantity: '1 cup', notes: null },
    { item: 'Eggs', quantity: '2', notes: null }
  ],
  steps: [
    { instruction: 'Mix ingredients', durationMinutes: null },
    { instruction: 'Bake until golden', durationMinutes: null }
  ],
  tags: ['#test'],
  tips: [],
  tools: [],
  metadata: {
    likes: null,
    comments: null,
    views: null,
    postedAt: new Date().toISOString(),
    durationSeconds: null,
    difficulty: 'Easy',
    prepTimeMinutes: 15,
    cookTimeMinutes: null,
    totalTimeMinutes: 15,
    servings: null
  },
  analysis: {
    provider: 'heuristic',
    generatedAt: new Date().toISOString()
  }
};

describe('recipes utilities', () => {
  it('normalises bullets from ingredient lines', () => {
    expect(normaliseLine('• 1 cup Sugar')).toBe('1 cup Sugar');
    expect(normaliseLine('- 2 tsp Salt')).toBe('2 tsp Salt');
  });

  it('extracts structured ingredients from captions', () => {
    const ingredients = extractIngredients('• 1 cup Sugar\n• 2 Eggs\nBake well');
    expect(ingredients).toHaveLength(2);
    expect(ingredients[0]).toMatchObject({ item: 'Sugar', quantity: '1 cup' });
    expect(ingredients[1]).toMatchObject({ item: 'Eggs', quantity: '2' });
  });

  it('merges structured output into heuristic recipe data', () => {
    const merged = mergeRecipeWithStructured(baseRecipe, {
      title: 'Updated Test Recipe',
      summary: 'An improved summary.',
      difficulty: 'Medium',
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      totalTimeMinutes: 30,
      servings: 4,
      tags: ['#updated'],
      tools: ['Oven Mitt'],
      tips: ['Let it cool before slicing.'],
      ingredients: [
        { item: 'Caster Sugar', quantity: '1 cup' }
      ],
      steps: [
        { instruction: 'Combine everything carefully.', title: 'Combine' }
      ]
    }, 'gemini-2.0-flash');

    expect(merged.title).toBe('Updated Test Recipe');
    expect(merged.summary).toBe('An improved summary.');
    expect(merged.metadata.difficulty).toBe('Medium');
    expect(merged.metadata.totalTimeMinutes).toBe(30);
    expect(merged.metadata.servings).toBe(4);
    expect(merged.ingredients[0].item).toBe('Caster Sugar');
    expect(merged.analysis.provider).toBe('gemini-structured');
    expect(merged.analysis.model).toBe('gemini-2.0-flash');
  });
});
