import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RecipeChatbot } from "./RecipeChatbot";
import type { RecipeData } from "@/models/InstagramRecipePost";

// Mock fetch
global.fetch = jest.fn();

describe("RecipeChatbot", () => {
  const mockRecipeData: RecipeData = {
    title: "Test Recipe",
    ingredients: ["1 cup flour", "2 eggs"],
    steps: ["Mix ingredients", "Bake at 350F"],
    cuisine: "Italian",
    tags: ["easy", "quick"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic rendering", () => {
    it("should render chatbot toggle button when closed", () => {
      render(
        <RecipeChatbot
          recipeId="test-recipe-123"
          variantId={null}
          recipeData={mockRecipeData}
        />
      );

      const toggleButton = screen.getByLabelText(/open recipe chat/i);
      expect(toggleButton).toBeInTheDocument();
    });

    it("should open chatbot panel when toggle button is clicked", async () => {
      render(
        <RecipeChatbot
          recipeId="test-recipe-123"
          variantId={null}
          recipeData={mockRecipeData}
        />
      );

      const toggleButton = screen.getByLabelText(/open recipe chat/i);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText(/recipe assistant/i)).toBeInTheDocument();
      });
    });

    it("should display quick prompts when opened", async () => {
      render(
        <RecipeChatbot
          recipeId="test-recipe-123"
          variantId={null}
          recipeData={mockRecipeData}
        />
      );

      const toggleButton = screen.getByLabelText(/open recipe chat/i);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText(/make it spicier/i)).toBeInTheDocument();
        expect(screen.getByText(/vegan version/i)).toBeInTheDocument();
      });
    });
  });

  describe("Message sending", () => {
    it("should send message when user types and clicks send", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "Here's how to make it spicier..." }),
      });

      render(
        <RecipeChatbot
          recipeId="test-recipe-123"
          variantId={null}
          recipeData={mockRecipeData}
        />
      );

      const toggleButton = screen.getByLabelText(/open recipe chat/i);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/ask about this recipe/i)
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask about this recipe/i);
      const sendButton = screen.getByLabelText(/send message/i);

      fireEvent.change(input, {
        target: { value: "How can I make this healthier?" },
      });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/chat",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
        );
      });
    });

    it("should display assistant response after sending message", async () => {
      const mockResponse = "You can reduce the sugar by half.";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: mockResponse }),
      });

      render(
        <RecipeChatbot
          recipeId="test-recipe-123"
          variantId={null}
          recipeData={mockRecipeData}
        />
      );

      const toggleButton = screen.getByLabelText(/open recipe chat/i);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/ask about this recipe/i)
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask about this recipe/i);
      const sendButton = screen.getByLabelText(/send message/i);

      fireEvent.change(input, { target: { value: "How to make healthier?" } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(mockResponse)).toBeInTheDocument();
      });
    });
  });

  describe("Quick prompts", () => {
    it("should generate variant when quick prompt is clicked", async () => {
      const mockVariantData = {
        title: "Spicy Test Recipe",
        ingredients: ["1 cup flour", "2 eggs", "1 tsp chili flakes"],
        steps: ["Mix ingredients with chili", "Bake at 350F"],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          variant: mockVariantData,
          response: "I've made it spicier!",
        }),
      });

      render(
        <RecipeChatbot
          recipeId="test-recipe-123"
          variantId={null}
          recipeData={mockRecipeData}
        />
      );

      const toggleButton = screen.getByLabelText(/open recipe chat/i);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText(/make it spicier/i)).toBeInTheDocument();
      });

      const spicierButton = screen.getByText(/make it spicier/i);
      fireEvent.click(spicierButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/chat",
          expect.objectContaining({
            body: expect.stringContaining("spicier"),
          })
        );
      });
    });
  });

  describe("Variant preview", () => {
    it("should show variant preview when variant data is returned", async () => {
      const mockVariantData = {
        title: "Vegan Test Recipe",
        ingredients: ["1 cup flour", "flax eggs"],
        steps: ["Mix ingredients", "Bake at 350F"],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          variant: mockVariantData,
          response: "Here's a vegan version!",
        }),
      });

      render(
        <RecipeChatbot
          recipeId="test-recipe-123"
          variantId={null}
          recipeData={mockRecipeData}
        />
      );

      const toggleButton = screen.getByLabelText(/open recipe chat/i);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/ask about this recipe/i)
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask about this recipe/i);
      const sendButton = screen.getByLabelText(/send message/i);

      fireEvent.change(input, { target: { value: "Make it vegan" } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/vegan test recipe/i)).toBeInTheDocument();
      });
    });

    it("should call variant creation API when accept button is clicked", async () => {
      const mockVariantData = {
        title: "Vegan Test Recipe",
        ingredients: ["1 cup flour", "flax eggs"],
        steps: ["Mix ingredients", "Bake at 350F"],
      };

      // First call for chat, second for variant creation
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            variant: mockVariantData,
            response: "Here's a vegan version!",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "variant-123", ...mockVariantData }),
        });

      render(
        <RecipeChatbot
          recipeId="test-recipe-123"
          variantId={null}
          recipeData={mockRecipeData}
        />
      );

      const toggleButton = screen.getByLabelText(/open recipe chat/i);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/ask about this recipe/i)
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask about this recipe/i);
      const sendButton = screen.getByLabelText(/send message/i);

      fireEvent.change(input, { target: { value: "Make it vegan" } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/vegan test recipe/i)).toBeInTheDocument();
      });

      const acceptButton = screen.getByText(/accept/i);
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/recipes/test-recipe-123/variants",
          expect.objectContaining({
            method: "POST",
          })
        );
      });
    });
  });

  describe("Error handling", () => {
    it("should display error message when chat API fails", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error")
      );

      render(
        <RecipeChatbot
          recipeId="test-recipe-123"
          variantId={null}
          recipeData={mockRecipeData}
        />
      );

      const toggleButton = screen.getByLabelText(/open recipe chat/i);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/ask about this recipe/i)
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask about this recipe/i);
      const sendButton = screen.getByLabelText(/send message/i);

      fireEvent.change(input, { target: { value: "Test question" } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to send message/i)).toBeInTheDocument();
      });
    });
  });
});
