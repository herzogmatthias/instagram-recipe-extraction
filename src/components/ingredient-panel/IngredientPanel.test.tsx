import { fireEvent, render, screen } from "@testing-library/react";
import { IngredientPanel } from "./IngredientPanel";
import { RecipeDetailProvider } from "@/lib/state/recipeDetailStore";
import {
  createMockInstagramRecipePost,
  createMockRecipeData,
} from "@/lib/shared/utils/mockDataFactory";

const recipe = createMockInstagramRecipePost({
  recipe_data: createMockRecipeData({
    servings: { value: 2 },
    ingredients: [
      {
        id: "ing-1",
        name: "Ground beef",
        quantity: 200,
        unit: "g",
        section: "Beef",
        optional: false,
      },
      {
        id: "ing-2",
        name: "Sesame oil",
        quantity: 2,
        unit: "tbsp",
        section: "Sauce",
        optional: true,
        preparation: "divided",
      },
    ],
  }),
});

Object.defineProperty(navigator, "clipboard", {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
});

describe("IngredientPanel", () => {
  it("renders grouped ingredients and supports actions", async () => {
    render(
      <RecipeDetailProvider recipe={recipe}>
        <IngredientPanel recipe={recipe} />
      </RecipeDetailProvider>
    );

    expect(
      screen.getByRole("heading", { name: /Prep your mise en place/i })
    ).toBeInTheDocument();

    const checkbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByRole("tab", { name: /US/i }));
    expect(screen.getByRole("tab", { name: /US/i })).toHaveAttribute(
      "data-state",
      "active"
    );

    fireEvent.click(screen.getByRole("button", { name: /Copy list/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
