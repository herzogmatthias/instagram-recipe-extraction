import { fireEvent, render, screen } from "@testing-library/react";
import { CookModeDialog } from "./CookModeDialog";
import { RecipeDetailProvider, useRecipeDetail } from "@/lib/state/recipeDetailStore";
import {
  createMockInstagramRecipePost,
  createMockRecipeData,
} from "@/lib/shared/utils/mockDataFactory";

const recipe = createMockInstagramRecipePost({
  recipe_data: createMockRecipeData({
    steps: [
      {
        idx: 1,
        text: "Prep ingredients.",
        used_ingredients: [],
      },
    ],
  }),
});

function OpenButton() {
  const { setCookMode } = useRecipeDetail();
  return (
    <button type="button" onClick={() => setCookMode(true)}>
      Open cook mode
    </button>
  );
}

describe("CookModeDialog", () => {
  it("opens and displays current step", () => {
    render(
      <RecipeDetailProvider recipe={recipe}>
        <OpenButton />
        <CookModeDialog recipe={recipe} />
      </RecipeDetailProvider>
    );

    fireEvent.click(screen.getByText(/Open cook mode/i));
    expect(screen.getByText(/Step 1 of 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Prep ingredients/i)).toBeInTheDocument();
  });
});
