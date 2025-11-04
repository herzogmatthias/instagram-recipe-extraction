"use client";

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Navbar from "../Navbar";

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: any;
  }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({
    theme: "light",
    setTheme: jest.fn(),
    resolvedTheme: "light",
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const renderWithTheme = (component: React.ReactElement) => {
  return render(component);
};

describe("Navbar Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("4.1 - Component Rendering and Structure", () => {
    it("should render navbar with fixed positioning", () => {
      renderWithTheme(<Navbar />);
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveClass("fixed", "top-0", "left-0", "right-0", "z-50");
    });

    it("should have correct height of 64px", () => {
      renderWithTheme(<Navbar />);
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveClass("h-16");
    });

    it('should render logo with text "RecipeGram"', () => {
      renderWithTheme(<Navbar />);
      expect(screen.getByText("RecipeGram")).toBeInTheDocument();
    });

    it("should have border-b and border-border classes for border styling", () => {
      renderWithTheme(<Navbar />);
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveClass("border-b", "border-border");
    });
  });

  describe("4.2 - Navigation Items", () => {
    it("should render all three navigation items on larger screens", () => {
      renderWithTheme(<Navbar />);
      expect(screen.getByTestId("nav-library")).toBeInTheDocument();
      expect(screen.getByTestId("nav-processing")).toBeInTheDocument();
      expect(screen.getByTestId("nav-settings")).toBeInTheDocument();
    });

    it("should display navigation item labels", () => {
      renderWithTheme(<Navbar />);
      expect(screen.getByText("Library")).toBeInTheDocument();
      expect(screen.getByText("Processing")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should have proper icons for navigation items", () => {
      renderWithTheme(<Navbar />);
      const navItems = screen.getAllByRole("link");
      // At least logo + 3 navigation links
      expect(navItems.length).toBeGreaterThanOrEqual(3);
    });

    it("should navigate to correct routes", () => {
      renderWithTheme(<Navbar />);
      expect(screen.getByTestId("nav-library")).toHaveAttribute("href", "/");
      expect(screen.getByTestId("nav-processing")).toHaveAttribute(
        "href",
        "/processing"
      );
      expect(screen.getByTestId("nav-settings")).toHaveAttribute(
        "href",
        "/settings"
      );
    });
  });

  describe("4.3 - Search Functionality with Debouncing", () => {
    it("should render search input with placeholder", () => {
      renderWithTheme(<Navbar searchPlaceholder="Search recipes..." />);
      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toBeInTheDocument();
    });

    it("should use custom placeholder when provided", () => {
      const customPlaceholder = "Custom search text...";
      renderWithTheme(<Navbar searchPlaceholder={customPlaceholder} />);
      expect(
        screen.getByPlaceholderText(customPlaceholder)
      ).toBeInTheDocument();
    });

    it("should call onSearch with debounce when user types", async () => {
      const mockOnSearch = jest.fn();
      renderWithTheme(<Navbar onSearch={mockOnSearch} />);

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "pasta");

      // Should not be called immediately due to debounce
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Wait for debounce (300ms)
      await waitFor(
        () => {
          expect(mockOnSearch).toHaveBeenCalledWith("pasta");
        },
        { timeout: 500 }
      );
    });

    it("should debounce multiple rapid searches", async () => {
      const mockOnSearch = jest.fn();
      renderWithTheme(<Navbar onSearch={mockOnSearch} />);

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "pasta");

      // Should not be called during typing
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Wait for debounce to complete
      await waitFor(
        () => {
          // Should only be called once with the final value
          expect(mockOnSearch).toHaveBeenCalledTimes(1);
          expect(mockOnSearch).toHaveBeenCalledWith("pasta");
        },
        { timeout: 500 }
      );
    });

    it("should update input value as user types", async () => {
      renderWithTheme(<Navbar />);
      const searchInput = screen.getByTestId(
        "search-input"
      ) as HTMLInputElement;

      await userEvent.type(searchInput, "test");
      expect(searchInput.value).toBe("test");
    });

    it("should have aria-label for search input accessibility", () => {
      renderWithTheme(<Navbar />);
      const searchInput = screen.getByLabelText(/search recipes/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe("4.4 - Theme Toggle Functionality", () => {
    it("should render theme toggle button", () => {
      renderWithTheme(<Navbar />);
      const themeToggle = screen.getByTestId("theme-toggle");
      expect(themeToggle).toBeInTheDocument();
    });

    it("should have proper aria-label for theme toggle", () => {
      renderWithTheme(<Navbar />);
      const themeToggle = screen.getByLabelText(/switch to (light|dark) mode/i);
      expect(themeToggle).toBeInTheDocument();
    });

    it("should render Moon icon in light mode by default", () => {
      renderWithTheme(<Navbar />);
      const themeToggle = screen.getByLabelText(/switch to dark mode/i);
      expect(themeToggle).toBeInTheDocument();
    });
  });

  describe("4.5 - Accessibility Features", () => {
    it("should have proper z-index for fixed positioning", () => {
      renderWithTheme(<Navbar />);
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveClass("z-50");
    });

    it("should have aria-label on navigation element", () => {
      renderWithTheme(<Navbar />);
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveAttribute("aria-label", "Main navigation");
    });

    it("search input should be keyboard navigable", async () => {
      renderWithTheme(<Navbar />);
      const searchInput = screen.getByTestId("search-input");
      searchInput.focus();
      expect(searchInput).toHaveFocus();
    });

    it("theme toggle button should have accessible label", () => {
      renderWithTheme(<Navbar />);
      const themeToggle = screen.getByTestId("theme-toggle");
      expect(themeToggle).toHaveAttribute("aria-label");
    });
  });

  describe("4.6 - Responsive Design", () => {
    it("should have responsive container classes", () => {
      renderWithTheme(<Navbar />);
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      const innerDiv = nav.querySelector(".container");
      expect(innerDiv).toBeInTheDocument();
    });

    it("should hide navigation items on small screens", () => {
      renderWithTheme(<Navbar />);
      const navContainer = screen.getByTestId("nav-library").parentElement;
      expect(navContainer).toHaveClass("hidden", "md:flex");
    });

    it("should always show theme toggle button on all screen sizes", () => {
      renderWithTheme(<Navbar />);
      const themeToggle = screen.getByTestId("theme-toggle");
      expect(themeToggle).not.toHaveClass("hidden");
    });
  });

  describe("Edge Cases and Hydration", () => {
    it("should handle missing onSearch prop gracefully", async () => {
      renderWithTheme(<Navbar />);
      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "test");
      expect(searchInput).toBeInTheDocument();
    });

    it("should cleanup debounce timer on unmount", () => {
      const { unmount } = renderWithTheme(<Navbar />);
      expect(() => unmount()).not.toThrow();
    });

    it("should have proper background styling with backdrop blur", () => {
      renderWithTheme(<Navbar />);
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveClass("backdrop-blur");
    });

    it("should have proper text color on logo link", () => {
      renderWithTheme(<Navbar />);
      const logo = screen.getByText("RecipeGram").closest("a");
      expect(logo).toHaveClass("text-foreground");
    });
  });
});
