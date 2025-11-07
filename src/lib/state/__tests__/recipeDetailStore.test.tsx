import { renderHook, act } from "@testing-library/react";
import { RecipeDetailProvider, useRecipeDetail } from "../recipeDetailStore";
import {
  createMockInstagramRecipePost,
  createMockRecipeData,
} from "@/lib/shared/utils/mockDataFactory";
import { MIN_SERVINGS } from "@/lib/shared/constants/recipeDetail";

const recipe = createMockInstagramRecipePost({
  recipe_data: {
    ...createMockRecipeData({ servings: { value: 4 } }),
  },
});

describe("RecipeDetailStore", () => {
  it("initializes with recipe servings and updates via actions", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RecipeDetailProvider recipe={recipe}>{children}</RecipeDetailProvider>
    );

    const { result } = renderHook(() => useRecipeDetail(), { wrapper });

    expect(result.current.servings).toBe(4);

    act(() => {
      result.current.incrementServings();
    });
    expect(result.current.servings).toBe(5);

    act(() => {
      result.current.decrementServings();
      result.current.decrementServings();
      result.current.decrementServings();
      result.current.decrementServings();
      result.current.decrementServings();
    });

    expect(result.current.servings).toBe(MIN_SERVINGS);
  });

  it("tracks unit system and ingredient toggles", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RecipeDetailProvider recipe={recipe}>{children}</RecipeDetailProvider>
    );
    const { result } = renderHook(() => useRecipeDetail(), { wrapper });

    act(() => {
      result.current.setUnitSystem("us");
    });
    expect(result.current.unitSystem).toBe("us");

    act(() => {
      result.current.toggleIngredient("1");
    });
    expect(result.current.checkedIngredientIds.has("1")).toBe(true);
  });
});
