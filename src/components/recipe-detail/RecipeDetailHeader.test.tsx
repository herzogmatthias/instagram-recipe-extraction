import { render, screen } from "@testing-library/react";
import { RecipeDetailHeader } from "./RecipeDetailHeader";
import { createMockInstagramRecipePost } from "@/lib/shared/utils/mockDataFactory";

describe("RecipeDetailHeader", () => {
  it("shows title, author, and actions", () => {
    const recipe = createMockInstagramRecipePost({
      ownerFullName: "Chef Example",
      ownerUsername: "chefexample",
      recipe_data: {
        title: "Signature Dish",
        ingredients: [],
        steps: [],
      },
      timestamp: "2025-01-05T12:00:00Z",
    });

    render(<RecipeDetailHeader recipe={recipe} />);

    expect(
      screen.getByRole("heading", { name: /Signature Dish/i })
    ).toBeInTheDocument();
    expect(screen.getByText("@chefexample")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Open IG/i })).toHaveAttribute(
      "href",
      recipe.url
    );
  });
});
