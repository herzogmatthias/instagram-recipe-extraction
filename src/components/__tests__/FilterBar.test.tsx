import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../FilterBar";

describe("FilterBar", () => {
  const mockCuisines = ["Italian", "Asian", "Mexican", "French"];
  const mockTags = [
    "easy",
    "quick",
    "healthy",
    "vegan",
    "gluten-free",
    "dairy-free",
  ];

  describe("rendering", () => {
    it("should render search input", () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);
      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute(
        "placeholder",
        expect.stringContaining("Search recipes")
      );
    });

    it("should render cuisine filter button", () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);
      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");
      expect(cuisineButton).toBeInTheDocument();
      expect(cuisineButton).toHaveTextContent("Cuisine");
    });

    it("should render tags filter button", () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);
      const tagsButton = screen.getByTestId("tags-filter-trigger");
      expect(tagsButton).toBeInTheDocument();
      expect(tagsButton).toHaveTextContent("Tags");
    });

    it("should not render clear button initially", () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);
      const clearButton = screen.queryByTestId("clear-filters-button");
      expect(clearButton).not.toBeInTheDocument();
    });

    it("should render with empty data gracefully", () => {
      render(<FilterBar cuisines={[]} tags={[]} />);
      expect(screen.getByTestId("cuisine-filter-trigger")).toBeInTheDocument();
      expect(screen.getByTestId("tags-filter-trigger")).toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    it("should update search query on input", async () => {
      const handleFilterChange = jest.fn();
      render(
        <FilterBar
          cuisines={mockCuisines}
          tags={mockTags}
          onFilterChange={handleFilterChange}
        />
      );

      const searchInput = screen.getByTestId(
        "search-input"
      ) as HTMLInputElement;
      await userEvent.type(searchInput, "pasta");

      expect(searchInput.value).toBe("pasta");
      expect(handleFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: "pasta",
          selectedCuisines: [],
          selectedTags: [],
        })
      );
    });

    it("should handle clear search input", async () => {
      const handleFilterChange = jest.fn();
      render(
        <FilterBar
          cuisines={mockCuisines}
          tags={mockTags}
          onFilterChange={handleFilterChange}
        />
      );

      const searchInput = screen.getByTestId(
        "search-input"
      ) as HTMLInputElement;
      await userEvent.type(searchInput, "pasta");
      await userEvent.clear(searchInput);

      expect(searchInput.value).toBe("");
      expect(handleFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          searchQuery: "",
        })
      );
    });
  });

  describe("cuisine filter", () => {
    it("should open cuisine dropdown on button click", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");
      await userEvent.click(cuisineButton);

      expect(screen.getByText("Italian")).toBeInTheDocument();
      expect(screen.getByText("Asian")).toBeInTheDocument();
      expect(screen.getByText("Mexican")).toBeInTheDocument();
    });

    it("should select and deselect cuisine", async () => {
      const handleFilterChange = jest.fn();
      render(
        <FilterBar
          cuisines={mockCuisines}
          tags={mockTags}
          onFilterChange={handleFilterChange}
        />
      );

      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");
      await userEvent.click(cuisineButton);

      const italianOption = screen.getByTestId("cuisine-option-Italian");
      await userEvent.click(italianOption);

      expect(handleFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedCuisines: ["Italian"],
        })
      );

      // Dropdown will close after first click, need to reopen
      await userEvent.click(cuisineButton);
      const italianOptionAgain = screen.getByTestId("cuisine-option-Italian");
      await userEvent.click(italianOptionAgain);

      expect(handleFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          selectedCuisines: [],
        })
      );
    });

    it("should display count of selected cuisines", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");
      await userEvent.click(cuisineButton);

      const italianOption = screen.getByTestId("cuisine-option-Italian");

      await userEvent.click(italianOption);

      // After clicking once, the button should show the count
      expect(cuisineButton).toHaveTextContent("(1)");

      // Need to reopen to select another
      await userEvent.click(cuisineButton);
      const asianOption = screen.getByTestId("cuisine-option-Asian");
      await userEvent.click(asianOption);

      // Now should show (2)
      expect(cuisineButton).toHaveTextContent("(2)");
    });

    it("should show message when no cuisines available", async () => {
      render(<FilterBar cuisines={[]} tags={mockTags} />);

      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");
      await userEvent.click(cuisineButton);

      expect(screen.getByText("No cuisines available")).toBeInTheDocument();
    });
  });

  describe("tags filter", () => {
    it("should open tags dropdown on button click", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      const tagsButton = screen.getByTestId("tags-filter-trigger");
      await userEvent.click(tagsButton);

      expect(screen.getByText("easy")).toBeInTheDocument();
      expect(screen.getByText("quick")).toBeInTheDocument();
      expect(screen.getByText("vegan")).toBeInTheDocument();
    });

    it("should select multiple tags", async () => {
      const handleFilterChange = jest.fn();
      render(
        <FilterBar
          cuisines={mockCuisines}
          tags={mockTags}
          onFilterChange={handleFilterChange}
        />
      );

      const tagsButton = screen.getByTestId("tags-filter-trigger");
      await userEvent.click(tagsButton);

      const easyTag = screen.getByTestId("tag-option-easy");

      await userEvent.click(easyTag);

      expect(handleFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedTags: ["easy"],
        })
      );

      // Reopen dropdown to click another tag
      await userEvent.click(tagsButton);
      const quickTag = screen.getByTestId("tag-option-quick");
      await userEvent.click(quickTag);

      expect(handleFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          selectedTags: ["easy", "quick"],
        })
      );
    });

    it("should display count of selected tags", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      const tagsButton = screen.getByTestId("tags-filter-trigger");
      await userEvent.click(tagsButton);

      const easyTag = screen.getByTestId("tag-option-easy");
      await userEvent.click(easyTag);

      expect(tagsButton).toHaveTextContent("(1)");
    });

    it("should show message when no tags available", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={[]} />);

      const tagsButton = screen.getByTestId("tags-filter-trigger");
      await userEvent.click(tagsButton);

      expect(screen.getByText("No tags available")).toBeInTheDocument();
    });

    it("should handle scrolling for many tags", async () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag-${i}`);
      render(<FilterBar cuisines={mockCuisines} tags={manyTags} />);

      const tagsButton = screen.getByTestId("tags-filter-trigger");
      await userEvent.click(tagsButton);

      const firstTag = screen.getByTestId("tag-option-tag-0");
      expect(firstTag).toBeInTheDocument();
    });
  });

  describe("filter combinations", () => {
    it("should handle multiple filter combinations", async () => {
      const handleFilterChange = jest.fn();
      render(
        <FilterBar
          cuisines={mockCuisines}
          tags={mockTags}
          onFilterChange={handleFilterChange}
        />
      );

      // Set search
      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "healthy");

      // Select cuisine
      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");
      await userEvent.click(cuisineButton);
      const italianOption = screen.getByTestId("cuisine-option-Italian");
      await userEvent.click(italianOption);

      // Select tags
      const tagsButton = screen.getByTestId("tags-filter-trigger");
      await userEvent.click(tagsButton);
      const veganTag = screen.getByTestId("tag-option-vegan");
      await userEvent.click(veganTag);

      expect(handleFilterChange).toHaveBeenLastCalledWith({
        searchQuery: "healthy",
        selectedCuisines: ["Italian"],
        selectedTags: ["vegan"],
      });
    });
  });

  describe("clear filters", () => {
    it("should not show clear button when no filters applied", () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);
      const clearButton = screen.queryByTestId("clear-filters-button");
      expect(clearButton).not.toBeInTheDocument();
    });

    it("should show clear button when search query exists", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);
      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "pasta");

      const clearButton = screen.getByTestId("clear-filters-button");
      expect(clearButton).toBeInTheDocument();
    });

    it("should show clear button when cuisines selected", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");
      await userEvent.click(cuisineButton);

      const italianOption = screen.getByTestId("cuisine-option-Italian");
      await userEvent.click(italianOption);

      const clearButton = screen.getByTestId("clear-filters-button");
      expect(clearButton).toBeInTheDocument();
    });

    it("should show clear button when tags selected", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      const tagsButton = screen.getByTestId("tags-filter-trigger");
      await userEvent.click(tagsButton);

      const easyTag = screen.getByTestId("tag-option-easy");
      await userEvent.click(easyTag);

      const clearButton = screen.getByTestId("clear-filters-button");
      expect(clearButton).toBeInTheDocument();
    });

    it("should clear all filters when clear button clicked", async () => {
      const handleFilterChange = jest.fn();
      render(
        <FilterBar
          cuisines={mockCuisines}
          tags={mockTags}
          onFilterChange={handleFilterChange}
        />
      );

      // Apply filters
      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "pasta");

      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");
      await userEvent.click(cuisineButton);
      const italianOption = screen.getByTestId("cuisine-option-Italian");
      await userEvent.click(italianOption);

      // Clear all
      const clearButton = screen.getByTestId("clear-filters-button");
      await userEvent.click(clearButton);

      expect(handleFilterChange).toHaveBeenLastCalledWith({
        searchQuery: "",
        selectedCuisines: [],
        selectedTags: [],
      });

      // Clear button should disappear
      expect(
        screen.queryByTestId("clear-filters-button")
      ).not.toBeInTheDocument();
    });

    it("should clear search input after clicking clear button", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      const searchInput = screen.getByTestId(
        "search-input"
      ) as HTMLInputElement;
      await userEvent.type(searchInput, "pasta");

      const clearButton = screen.getByTestId("clear-filters-button");
      await userEvent.click(clearButton);

      expect(searchInput.value).toBe("");
    });
  });

  describe("accessibility", () => {
    it("should have proper aria labels", () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      const searchInput = screen.getByLabelText("Search recipes");
      expect(searchInput).toBeInTheDocument();

      // Use testid instead since aria-label includes dynamic text
      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");
      expect(cuisineButton).toHaveAttribute("aria-label", "Filter by cuisine");

      const tagsButton = screen.getByTestId("tags-filter-trigger");
      expect(tagsButton).toHaveAttribute("aria-label", "Filter by tags");
    });

    it("should update aria label with selected count", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");

      // Initially no count
      expect(cuisineButton).toHaveAttribute("aria-label", "Filter by cuisine");

      // Select a cuisine
      await userEvent.click(cuisineButton);
      const italianOption = screen.getByTestId("cuisine-option-Italian");
      await userEvent.click(italianOption);

      // Should update aria label
      expect(cuisineButton).toHaveAttribute(
        "aria-label",
        expect.stringContaining("1")
      );
    });

    it('should have role="search" on container', () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);
      const container = screen.getByRole("search");
      expect(container).toBeInTheDocument();
    });
  });

  describe("optional props", () => {
    it("should handle missing onFilterChange callback", async () => {
      render(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "pasta");

      expect(searchInput).toHaveValue("pasta");
    });

    it("should handle empty cuisines array", () => {
      render(<FilterBar cuisines={[]} tags={mockTags} />);
      const cuisineButton = screen.getByTestId("cuisine-filter-trigger");
      expect(cuisineButton).toBeInTheDocument();
    });

    it("should handle empty tags array", () => {
      render(<FilterBar cuisines={mockCuisines} tags={[]} />);
      const tagsButton = screen.getByTestId("tags-filter-trigger");
      expect(tagsButton).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle rapid filter changes", async () => {
      const handleFilterChange = jest.fn();
      render(
        <FilterBar
          cuisines={mockCuisines}
          tags={mockTags}
          onFilterChange={handleFilterChange}
        />
      );

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "abc");

      expect(handleFilterChange.mock.calls.length).toBeGreaterThan(0);
    });

    it("should preserve filters when re-rendering", async () => {
      const { rerender } = render(
        <FilterBar cuisines={mockCuisines} tags={mockTags} />
      );

      const searchInput = screen.getByTestId(
        "search-input"
      ) as HTMLInputElement;
      await userEvent.type(searchInput, "pasta");

      expect(searchInput.value).toBe("pasta");

      rerender(<FilterBar cuisines={mockCuisines} tags={mockTags} />);

      expect(searchInput.value).toBe("pasta");
    });
  });
});
