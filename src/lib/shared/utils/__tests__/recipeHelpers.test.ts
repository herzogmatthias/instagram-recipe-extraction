import { describe, it, expect } from "@jest/globals";
import {
  extractTitle,
  formatTime,
  formatDifficulty,
  formatCuisine,
  formatMacros,
  formatMetaPills,
} from "../recipeHelpers";
import { InstagramRecipePost, Macros } from "@/models/InstagramRecipePost";

describe("recipeHelpers", () => {
  describe("extractTitle", () => {
    it("should return recipe_data.title when available", () => {
      const recipe = {
        recipe_data: { title: "Delicious Recipe", ingredients: [], steps: [] },
        caption: "Some caption",
      } as InstagramRecipePost;

      expect(extractTitle(recipe)).toBe("Delicious Recipe");
    });

    it("should fallback to first line of caption when recipe_data.title is missing", () => {
      const recipe = {
        caption: "Stovetop Meatballs\nIngredients...",
      } as InstagramRecipePost;

      expect(extractTitle(recipe)).toBe("Stovetop Meatballs");
    });

    it("should truncate long captions", () => {
      const recipe = {
        caption: "A".repeat(150),
      } as InstagramRecipePost;

      const result = extractTitle(recipe);
      expect(result).toHaveLength(63);
      expect(result).toContain("...");
    });

    it("should return Untitled Recipe when no title or caption", () => {
      const recipe = {} as InstagramRecipePost;

      expect(extractTitle(recipe)).toBe("Untitled Recipe");
    });
  });

  describe("formatTime", () => {
    it("should format minutes correctly", () => {
      expect(formatTime(30)).toBe("30 min");
      expect(formatTime(45)).toBe("45 min");
    });

    it("should format hours correctly", () => {
      expect(formatTime(60)).toBe("1 hr");
      expect(formatTime(120)).toBe("2 hr");
    });

    it("should format hours and minutes correctly", () => {
      expect(formatTime(90)).toBe("1h 30m");
      expect(formatTime(135)).toBe("2h 15m");
    });

    it("should return null for invalid values", () => {
      expect(formatTime(0)).toBeNull();
      expect(formatTime(-5)).toBeNull();
      expect(formatTime(undefined)).toBeNull();
    });
  });

  describe("formatDifficulty", () => {
    it("should capitalize difficulty", () => {
      expect(formatDifficulty("easy")).toBe("Easy");
      expect(formatDifficulty("medium")).toBe("Medium");
      expect(formatDifficulty("hard")).toBe("Hard");
    });

    it("should return null for missing difficulty", () => {
      expect(formatDifficulty(undefined)).toBeNull();
    });
  });

  describe("formatCuisine", () => {
    it("should return cuisine as-is", () => {
      expect(formatCuisine("Italian")).toBe("Italian");
      expect(formatCuisine("Chinese")).toBe("Chinese");
    });

    it("should return null for missing cuisine", () => {
      expect(formatCuisine(undefined)).toBeNull();
    });
  });

  describe("formatMacros", () => {
    it("should format complete macros correctly", () => {
      const macros: Macros = {
        calories: 516,
        protein_g: 43,
        fat_g: 13,
        carbs_g: 56,
      };

      expect(formatMacros(macros)).toBe("516 kcal • 43/13/56");
    });

    it("should handle missing macros breakdown", () => {
      const macros: Macros = {
        calories: 300,
      };

      expect(formatMacros(macros)).toBe("300 kcal");
    });

    it("should return null for zero calories", () => {
      const macros: Macros = {
        calories: 0,
        protein_g: 10,
        fat_g: 5,
        carbs_g: 20,
      };

      expect(formatMacros(macros)).toBeNull();
    });

    it("should return null for all missing values", () => {
      const macros: Macros = {};

      expect(formatMacros(macros)).toBeNull();
      expect(formatMacros(null)).toBeNull();
      expect(formatMacros(undefined)).toBeNull();
    });

    it("should round decimal values", () => {
      const macros: Macros = {
        calories: 516,
        protein_g: 43.7,
        fat_g: 13.2,
        carbs_g: 56.8,
      };

      expect(formatMacros(macros)).toBe("516 kcal • 44/13/57");
    });
  });

  describe("formatMetaPills", () => {
    it("should return all available pills", () => {
      const recipe = {
        recipe_data: {
          title: "Test Recipe",
          total_time_min: 30,
          difficulty: "easy",
          cuisine: "Italian",
          macros_per_serving: {
            calories: 500,
            protein_g: 40,
            fat_g: 10,
            carbs_g: 50,
          },
          ingredients: [],
          steps: [],
        },
      } as InstagramRecipePost;

      const pills = formatMetaPills(recipe);
      expect(pills).toHaveLength(4);
      expect(pills[0]).toBe("30 min");
      expect(pills[1]).toBe("Easy");
      expect(pills[2]).toBe("Italian");
      expect(pills[3]).toBe("500 kcal • 40/10/50");
    });

    it("should handle missing recipe_data", () => {
      const recipe = {} as InstagramRecipePost;

      const pills = formatMetaPills(recipe);
      expect(pills).toHaveLength(0);
    });

    it("should skip missing fields", () => {
      const recipe = {
        recipe_data: {
          title: "Test Recipe",
          total_time_min: 45,
          ingredients: [],
          steps: [],
        },
      } as InstagramRecipePost;

      const pills = formatMetaPills(recipe);
      expect(pills).toHaveLength(1);
      expect(pills[0]).toBe("45 min");
    });
  });
});
