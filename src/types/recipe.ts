export interface InstagramPostRecord {
  id: string;
  'Post Type': string;
  Caption: string;
  'Like Count': string;
  'Comment Count': string;
  'View Count': string;
  'Author Username': string;
  'Author Full Name': string;
  'Author ID': string;
  'Author URL': string;
  'Author Is Verified': string;
  'Post URL': string;
  'Image URL': string;
  'Cover Image': string;
  'Posted At': string;
  Location: string;
  Duration: number | string;
  'Has Audio': string;
  'Audio Title': string;
  'Audio Artist': string;
  'Tagged Users': string;
}

export interface RecipeIngredient {
  item: string;
  quantity?: string | null;
  notes?: string | null;
}

export interface RecipeInstruction {
  title?: string | null;
  instruction: string;
  durationMinutes?: number | null;
}

export interface RecipeMetadata {
  likes: number | null;
  comments: number | null;
  views: number | null;
  postedAt: string;
  durationSeconds: number | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  servings: number | null;
}

export interface RecipeAnalysis {
  provider: 'heuristic' | 'gemini-structured';
  model?: string;
  generatedAt: string;
}

export interface Recipe {
  id: string;
  title: string;
  summary: string;
  author: {
    username: string;
    name: string;
    profileUrl: string;
    verified: boolean;
  };
  postUrl: string;
  media: {
    coverImage: string;
    videoUrl: string;
  };
  caption: string;
  ingredients: RecipeIngredient[];
  steps: RecipeInstruction[];
  tags: string[];
  tips: string[];
  tools: string[];
  metadata: RecipeMetadata;
  analysis: RecipeAnalysis;
}

export interface RecipeDraftInput {
  link: string;
  caption: string;
  coverImage?: string;
  videoUrl?: string;
  author?: {
    username?: string;
    name?: string;
  };
}
