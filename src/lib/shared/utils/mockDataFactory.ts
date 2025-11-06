import { InstagramRecipePost, RecipeData } from "@/models/InstagramRecipePost";

/**
 * Mock data factory for testing components
 */

export function createMockRecipeData(
  overrides?: Partial<RecipeData>
): RecipeData {
  return {
    title: "Test Recipe",
    ingredients: [
      {
        id: "1",
        name: "Test Ingredient",
        quantity: 1,
        unit: "cup",
        preparation: null,
        section: null,
        optional: false,
        chefs_note: "",
      },
    ],
    steps: [
      {
        idx: 1,
        text: "Test step",
        used_ingredients: ["1"],
        section: null,
        estimated_time_min: 10,
        chefs_note: "",
      },
    ],
    total_time_min: 30,
    difficulty: "easy",
    cuisine: "Italian",
    macros_per_serving: {
      calories: 500,
      protein_g: 40,
      fat_g: 10,
      carbs_g: 50,
    },
    tags: ["healthy", "quick"],
    ...overrides,
  };
}

export function createMockInstagramRecipePost(
  overrides?: Partial<InstagramRecipePost>
): InstagramRecipePost {
  return {
    inputUrl: "https://www.instagram.com/reel/test123/",
    id: "123456789",
    type: "Video",
    shortCode: "test123",
    caption: "Test Recipe\nDelicious test recipe caption",
    hashtags: ["recipe", "food"],
    mentions: [],
    url: "https://www.instagram.com/p/test123/",
    commentsCount: 10,
    firstComment: "Looks great!",
    latestComments: [],
    dimensionsHeight: 1080,
    dimensionsWidth: 1080,
    displayUrl: "https://example.com/image.jpg",
    images: ["https://example.com/image.jpg"],
    videoUrl: null,
    alt: "Test recipe image",
    likesCount: 100,
    videoViewCount: null,
    videoPlayCount: null,
    timestamp: new Date().toISOString(),
    childPosts: [],
    ownerFullName: "Test User",
    ownerUsername: "testuser",
    ownerId: "987654321",
    productType: "feed",
    videoDuration: null,
    isSponsored: false,
    musicInfo: undefined,
    isCommentsDisabled: false,
    recipe_data: createMockRecipeData(),
    ...overrides,
  };
}

/**
 * Create mock recipe with specific status (for testing different states)
 */
export function createMockRecipeWithStatus(
  status: "ready" | "queued" | "scraping" | "extracting" | "failed"
): InstagramRecipePost {
  const base = createMockInstagramRecipePost();

  switch (status) {
    case "queued":
      return {
        ...base,
        recipe_data: undefined,
      };
    case "scraping":
      return {
        ...base,
        displayUrl: undefined,
        recipe_data: undefined,
      };
    case "extracting":
      return {
        ...base,
        recipe_data: {
          ...createMockRecipeData(),
          ingredients: [],
          steps: [],
        },
      };
    case "failed":
      return {
        ...base,
        recipe_data: undefined,
      };
    case "ready":
    default:
      return base;
  }
}

/**
 * Create mock recipe with missing data (for testing edge cases)
 */
export function createMockRecipeWithMissingData(): InstagramRecipePost {
  return {
    inputUrl: "https://www.instagram.com/reel/test123/",
    id: "123456789",
    type: "Video",
    shortCode: "test123",
    caption: "",
    hashtags: [],
    mentions: [],
    url: "https://www.instagram.com/p/test123/",
    commentsCount: 0,
    latestComments: [],
    images: [],
    likesCount: 0,
    timestamp: new Date().toISOString(),
    childPosts: [],
    ownerUsername: "testuser",
    ownerId: "987654321",
  };
}
