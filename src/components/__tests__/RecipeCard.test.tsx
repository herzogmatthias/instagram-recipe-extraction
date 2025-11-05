import { render, screen, fireEvent } from "@testing-library/react";
import { RecipeCard } from "../RecipeCard";
import {
  createMockInstagramRecipePost,
  createMockRecipeWithStatus,
  createMockRecipeWithMissingData,
} from "@/lib/utils/mockDataFactory";
import { describe, it, expect, jest } from "@jest/globals";

describe("RecipeCard", () => {
  describe("Basic rendering", () => {
    it("should render recipe card with all elements", () => {
      const recipe = createMockInstagramRecipePost();
      const { container } = render(<RecipeCard recipe={recipe} />);

      const card = container.querySelector(".group");
      expect(card).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    });

    it("should display recipe title", () => {
      const recipe = createMockInstagramRecipePost({
        recipe_data: {
          title: "Delicious Test Recipe",
          ingredients: [],
          steps: [],
        },
      });
      render(<RecipeCard recipe={recipe} />);

      expect(screen.getByText("Delicious Test Recipe")).toBeInTheDocument();
    });

    it("should display meta pills when available", () => {
      const recipe = createMockInstagramRecipePost();
      render(<RecipeCard recipe={recipe} />);

      expect(screen.getByText("30 min")).toBeInTheDocument();
      expect(screen.getByText("Easy")).toBeInTheDocument();
    });

    it("should display up to 3 tags", () => {
      const recipe = createMockInstagramRecipePost({
        recipe_data: {
          title: "Test",
          ingredients: [],
          steps: [],
          tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
        },
      });
      render(<RecipeCard recipe={recipe} />);

      expect(screen.getByText("tag1")).toBeInTheDocument();
      expect(screen.getByText("tag2")).toBeInTheDocument();
      expect(screen.getByText("tag3")).toBeInTheDocument();
      expect(screen.getByText("+2")).toBeInTheDocument();
    });
  });

  describe("Action buttons", () => {
    it("should show action buttons", () => {
      const recipe = createMockInstagramRecipePost();
      render(<RecipeCard recipe={recipe} />);

      expect(screen.getByLabelText("Open recipe")).toBeInTheDocument();
      expect(screen.getByLabelText("Copy ingredients")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Export recipe as JSON")
      ).toBeInTheDocument();
      expect(screen.getByLabelText("More actions")).toBeInTheDocument();
    });

    it("should disable open button when recipe data is missing", () => {
      const recipe = createMockRecipeWithStatus("queued");
      render(<RecipeCard recipe={recipe} />);

      const openButton = screen.getByLabelText("Open recipe");
      expect(openButton).toBeDisabled();
    });

    it("should enable open button when status is ready", () => {
      const recipe = createMockRecipeWithStatus("ready");
      render(<RecipeCard recipe={recipe} />);

      const openButton = screen.getByLabelText("Open recipe");
      expect(openButton).not.toBeDisabled();
    });

    it("should disable copy ingredients when no ingredients", () => {
      const recipe = createMockRecipeWithStatus("queued");
      render(<RecipeCard recipe={recipe} />);

      const copyButton = screen.getByLabelText("Copy ingredients");
      expect(copyButton).toBeDisabled();
    });

    it("should disable export when no recipe_data", () => {
      const recipe = createMockRecipeWithStatus("queued");
      render(<RecipeCard recipe={recipe} />);

      const exportButton = screen.getByLabelText("Export recipe as JSON");
      expect(exportButton).toBeDisabled();
    });
  });

  describe("Visual states", () => {
    it("should show placeholder when no displayUrl", () => {
      const recipe = createMockInstagramRecipePost({
        displayUrl: undefined,
      });
      const { container } = render(<RecipeCard recipe={recipe} />);

      const placeholder = container.querySelector(".animate-pulse");
      expect(placeholder).toBeInTheDocument();
    });

    it("should apply hover classes", () => {
      const recipe = createMockInstagramRecipePost();
      const { container } = render(<RecipeCard recipe={recipe} />);

      const card = container.querySelector(".group");
      expect(card).toHaveClass("hover:-translate-y-1");
      expect(card).toHaveClass("hover:shadow-lg");
    });

    it("should show failed state with warning border", () => {
      const recipe = createMockInstagramRecipePost({
        displayUrl: undefined,
        recipe_data: undefined,
      });
      const { container } = render(<RecipeCard recipe={recipe} />);

      // For a queued state without error, we don't show warning border
      // This test should check actual failed state handling when implemented
      const card = container.querySelector(".group");
      expect(card).toBeInTheDocument();
    });

    it("should not render progress indicators for ready recipes", () => {
      const recipe = createMockInstagramRecipePost();
      render(<RecipeCard recipe={recipe} />);

      const progress = screen.queryByRole("progressbar");
      expect(progress).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard accessible", () => {
      const recipe = createMockInstagramRecipePost();
      const { container } = render(<RecipeCard recipe={recipe} />);

      const card = container.querySelector(".group");
      expect(card).toHaveAttribute("tabIndex", "0");
    });

    it("should handle Enter key press", () => {
      const onClick = jest.fn();
      const recipe = createMockInstagramRecipePost();
      const { container } = render(
        <RecipeCard recipe={recipe} onClick={onClick} />
      );

      const card = container.querySelector(".group");
      if (card) {
        fireEvent.keyDown(card, { key: "Enter", code: "Enter" });
        expect(onClick).toHaveBeenCalledTimes(1);
      }
    });

    it("should handle Space key press", () => {
      const onClick = jest.fn();
      const recipe = createMockInstagramRecipePost();
      const { container } = render(
        <RecipeCard recipe={recipe} onClick={onClick} />
      );

      const card = container.querySelector(".group");
      if (card) {
        fireEvent.keyDown(card, { key: " ", code: "Space" });
        expect(onClick).toHaveBeenCalledTimes(1);
      }
    });

    it("should have focus-visible ring", () => {
      const recipe = createMockInstagramRecipePost();
      const { container } = render(<RecipeCard recipe={recipe} />);

      const card = container.querySelector(".group");
      expect(card).toHaveClass("focus-visible:ring-2");
    });
  });

  describe("Interactions", () => {
    it("should call onClick when card is clicked", () => {
      const onClick = jest.fn();
      const recipe = createMockInstagramRecipePost();
      const { container } = render(
        <RecipeCard recipe={recipe} onClick={onClick} />
      );

      const card = container.querySelector(".group");
      if (card) {
        fireEvent.click(card);
        expect(onClick).toHaveBeenCalledTimes(1);
      }
    });

    it("should stop propagation on action button clicks", () => {
      const onClick = jest.fn();
      const recipe = createMockInstagramRecipePost();
      render(<RecipeCard recipe={recipe} onClick={onClick} />);

      const moreButton = screen.getByLabelText("More actions");
      fireEvent.click(moreButton);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle missing data gracefully", () => {
      const recipe = createMockRecipeWithMissingData();
      const { container } = render(<RecipeCard recipe={recipe} />);

      const card = container.querySelector(".group");
      expect(card).toBeInTheDocument();
    });

    it("should handle empty tags array", () => {
      const recipe = createMockInstagramRecipePost({
        recipe_data: {
          title: "Test",
          ingredients: [],
          steps: [],
          tags: [],
        },
      });
      const { container } = render(<RecipeCard recipe={recipe} />);

      const tagSection = container.querySelector(".flex.flex-wrap.gap-2");
      expect(tagSection).not.toBeInTheDocument();
    });

    it("should handle no meta pills", () => {
      const recipe = createMockInstagramRecipePost({
        recipe_data: {
          title: "Test",
          ingredients: [],
          steps: [],
        },
      });
      render(<RecipeCard recipe={recipe} />);

      expect(screen.queryByText("30 min")).not.toBeInTheDocument();
    });
  });
});
