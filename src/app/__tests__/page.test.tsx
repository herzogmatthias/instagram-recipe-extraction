import { render, screen } from "@testing-library/react";
import Home from "../page";
import * as recipeHook from "../../lib/client/hooks/useRecipeData";
import { ProcessingQueueProvider } from "../../lib/client/hooks/useProcessingQueue";

// Mock the useRecipeData hook
jest.mock("../../lib/client/hooks/useRecipeData");

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage(props: Record<string, unknown>) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

const mockRecipeHook = recipeHook.useRecipeData as jest.MockedFunction<
  typeof recipeHook.useRecipeData
>;

const createMockRecipe = (overrides: Record<string, unknown> = {}) => ({
  inputUrl: "https://www.instagram.com/reel/test",
  id: "123456789",
  type: "Video" as const,
  shortCode: "test123",
  caption: "Delicious recipe",
  hashtags: [],
  mentions: [],
  url: "https://www.instagram.com/p/test",
  commentsCount: 10,
  latestComments: [],
  displayUrl: "https://example.com/image.jpg",
  images: [],
  videoUrl: "https://example.com/video.mp4",
  alt: null,
  likesCount: 100,
  timestamp: "2025-01-01T00:00:00Z",
  childPosts: [],
  ownerUsername: "testuser",
  ownerId: "123",
  recipe_data: {
    $schema: "schema.json",
    $id: "recipe-123",
    title: "Test Recipe",
    ref_id: "123456789",
    ingredients: [],
    steps: [],
  },
  ...overrides,
});

describe("HomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display loading skeletons while fetching recipes", () => {
    mockRecipeHook.mockReturnValue({
      recipes: [],
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <ProcessingQueueProvider>
        <Home />
      </ProcessingQueueProvider>
    );

    const loadingState = screen.getByTestId("loading-state");
    expect(loadingState).toBeInTheDocument();
  });

  it("should show empty state when no recipes are loaded", () => {
    mockRecipeHook.mockReturnValue({
      recipes: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <ProcessingQueueProvider>
        <Home />
      </ProcessingQueueProvider>
    );

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No recipes yet")).toBeInTheDocument();
  });

  it("should display error message when recipes fail to load", () => {
    const error = new Error("Failed to fetch recipes");
    mockRecipeHook.mockReturnValue({
      recipes: [],
      loading: false,
      error,
      refetch: jest.fn(),
    });

    render(
      <ProcessingQueueProvider>
        <Home />
      </ProcessingQueueProvider>
    );

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("should display recipe cards in a grid when recipes are loaded", () => {
    const recipes = [
      createMockRecipe({ id: "recipe1" }),
      createMockRecipe({ id: "recipe2" }),
    ];

    mockRecipeHook.mockReturnValue({
      recipes,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <ProcessingQueueProvider>
        <Home />
      </ProcessingQueueProvider>
    );

    expect(screen.getByTestId("recipe-grid")).toBeInTheDocument();
  });

  it("should show filter bar with multiple recipes", () => {
    const recipes = [
      createMockRecipe({ id: "recipe1" }),
      createMockRecipe({ id: "recipe2" }),
    ];

    mockRecipeHook.mockReturnValue({
      recipes,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <ProcessingQueueProvider>
        <Home />
      </ProcessingQueueProvider>
    );

    expect(screen.getByTestId("filter-bar-container")).toBeInTheDocument();
  });

  it("should have proper navigation role", () => {
    mockRecipeHook.mockReturnValue({
      recipes: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <ProcessingQueueProvider>
        <Home />
      </ProcessingQueueProvider>
    );

    const navbar = screen.getByRole("navigation");
    expect(navbar).toBeInTheDocument();
  });

  it("should display heading with proper hierarchy", () => {
    mockRecipeHook.mockReturnValue({
      recipes: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <ProcessingQueueProvider>
        <Home />
      </ProcessingQueueProvider>
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });
});
