import { fireEvent, render, screen } from "@testing-library/react";
import { StepsPanel } from "./StepsPanel";
import { RecipeDetailProvider } from "@/lib/state/recipeDetailStore";
import {
  createMockInstagramRecipePost,
  createMockRecipeData,
} from "@/lib/shared/utils/mockDataFactory";

const recipe = createMockInstagramRecipePost({
  recipe_data: createMockRecipeData({
    steps: [
      {
        idx: 1,
        text: "Marinate the beef.",
        used_ingredients: ["1"],
        estimated_time_min: 5,
        chefs_note: "Use light soy sauce.",
      },
      {
        idx: 2,
        text: "Stir-fry until crisp.",
        used_ingredients: [],
      },
    ],
    ingredients: [
      {
        id: "1",
        name: "Beef",
        quantity: 200,
        unit: "g",
      },
    ],
  }),
});

describe("StepsPanel", () => {
  it("renders steps and toggles active state", () => {
    render(
      <RecipeDetailProvider recipe={recipe}>
        <StepsPanel recipe={recipe} />
      </RecipeDetailProvider>
    );

    const firstStep = screen.getByText(/Marinate the beef/i).closest("div[data-active]");
    expect(firstStep).toHaveAttribute("data-active", "false");

    fireEvent.click(firstStep!);
    expect(firstStep).toHaveAttribute("data-active", "true");

    expect(screen.getByRole("button", { name: /Cook mode/i })).toBeInTheDocument();
  });
});
