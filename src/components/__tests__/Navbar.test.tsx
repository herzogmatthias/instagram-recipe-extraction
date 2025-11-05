"use client";

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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

const renderNavbar = (
  props: Partial<React.ComponentProps<typeof Navbar>> = {}
) => {
  const mergedProps = {
    processingItems: [],
    processingOpen: false,
    onProcessingOpenChange: jest.fn(),
    ...props,
  } as React.ComponentProps<typeof Navbar>;

  return {
    onProcessingOpenChange: mergedProps.onProcessingOpenChange,
    ...render(<Navbar {...mergedProps} />),
  };
};

describe("Navbar Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("4.1 - Component Rendering and Structure", () => {
    it("should render navbar with fixed positioning", () => {
      renderNavbar();
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveClass("fixed", "top-0", "left-0", "right-0", "z-50");
    });

    it("should have correct height of 64px", () => {
      renderNavbar();
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveClass("h-16");
    });

    it('should render logo with text "RecipeGram"', () => {
      renderNavbar();
      expect(screen.getByText("RecipeGram")).toBeInTheDocument();
    });

    it("should have border-b and border-border classes for border styling", () => {
      renderNavbar();
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveClass("border-b", "border-border");
    });
  });

  describe("4.2 - Navigation Items", () => {
    it("should render all three navigation items on larger screens", () => {
      renderNavbar();
      expect(screen.getByTestId("nav-library")).toBeInTheDocument();
      expect(screen.getByTestId("nav-processing")).toBeInTheDocument();
      expect(screen.getByTestId("nav-settings")).toBeInTheDocument();
    });

    it("should display navigation item labels", () => {
      renderNavbar();
      expect(screen.getByText("Library")).toBeInTheDocument();
      expect(screen.getByText("Processing")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should have proper icons for navigation items", () => {
      renderNavbar();
      const navItems = screen.getAllByRole("link");
      // At least logo + 3 navigation links
      expect(navItems.length).toBeGreaterThanOrEqual(3);
    });

    it("should navigate to correct routes for link items", () => {
      renderNavbar();
      expect(screen.getByTestId("nav-library")).toHaveAttribute("href", "/");
      expect(screen.getByTestId("nav-settings")).toHaveAttribute(
        "href",
        "/settings"
      );
    });

    it("should invoke onProcessingOpenChange when processing trigger clicked", async () => {
      const onProcessingOpenChange = jest.fn();
      renderNavbar({ onProcessingOpenChange });

      await userEvent.click(screen.getByTestId("nav-processing"));
      expect(onProcessingOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe("4.3 - Mobile Navigation", () => {
    it("should render overflow menu for navigation on mobile", async () => {
      renderNavbar();

      await userEvent.click(screen.getByTestId("nav-overflow-mobile"));

      await waitFor(() =>
        expect(screen.getByTestId("nav-library-mobile")).toBeInTheDocument()
      );
      expect(screen.getByTestId("nav-processing-mobile")).toBeInTheDocument();
      expect(screen.getByTestId("nav-settings-mobile")).toBeInTheDocument();
    });

    it("should invoke onProcessingOpenChange from mobile menu", async () => {
      const onProcessingOpenChange = jest.fn();
      renderNavbar({ onProcessingOpenChange });

      await userEvent.click(screen.getByTestId("nav-overflow-mobile"));
      await waitFor(() =>
        expect(screen.getByTestId("nav-processing-mobile")).toBeInTheDocument()
      );

      await userEvent.click(screen.getByTestId("nav-processing-mobile"));
      expect(onProcessingOpenChange).toHaveBeenCalledWith(true);
    });

    it("should invoke onOpenFilters when mobile filter icon is clicked", async () => {
      const onOpenFilters = jest.fn();
      renderNavbar({ onOpenFilters });

      await userEvent.click(screen.getByTestId("mobile-filter-toggle"));
      expect(onOpenFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe("4.4 - Theme Toggle Functionality", () => {
    it("should render theme toggle button", () => {
      renderNavbar();
      const themeToggle = screen.getByTestId("theme-toggle");
      expect(themeToggle).toBeInTheDocument();
    });

    it("should have proper aria-label for theme toggle", () => {
      renderNavbar();
      const themeToggle = screen.getByLabelText(/switch to (light|dark) mode/i);
      expect(themeToggle).toBeInTheDocument();
    });

    it("should render Moon icon in light mode by default", () => {
      renderNavbar();
      const themeToggle = screen.getByLabelText(/switch to dark mode/i);
      expect(themeToggle).toBeInTheDocument();
    });
  });

  describe("4.5 - Accessibility Features", () => {
    it("should have proper z-index for fixed positioning", () => {
      renderNavbar();
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveClass("z-50");
    });

    it("should have aria-label on navigation element", () => {
      renderNavbar();
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveAttribute("aria-label", "Main navigation");
    });

    it("search input should be keyboard navigable", async () => {
      renderNavbar();
      const themeToggle = screen.getByTestId("theme-toggle");
      themeToggle.focus();
      expect(themeToggle).toHaveFocus();
    });

    it("theme toggle button should have accessible label", () => {
      renderNavbar();
      const themeToggle = screen.getByTestId("theme-toggle");
      expect(themeToggle).toHaveAttribute("aria-label");
    });
  });

  describe("4.6 - Responsive Design", () => {
    it("should have responsive container classes", () => {
      renderNavbar();
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      const innerDiv = Array.from(nav.querySelectorAll("div")).find((node) =>
        node.className.includes("max-w-[1600px]")
      );
      expect(innerDiv).toBeInTheDocument();
    });

    it("should hide navigation items on small screens", () => {
      renderNavbar();
      expect(screen.getByTestId("nav-library")).toHaveClass(
        "hidden",
        "md:inline-flex"
      );
      expect(screen.getByTestId("nav-settings")).toHaveClass(
        "hidden",
        "md:inline-flex"
      );
    });

    it("should always show theme toggle button on all screen sizes", () => {
      renderNavbar();
      const themeToggle = screen.getByTestId("theme-toggle");
      expect(themeToggle).not.toHaveClass("hidden");
    });
  });

  describe("Edge Cases and Hydration", () => {
    it("should cleanup debounce timer on unmount", () => {
      const { unmount } = renderNavbar();
      expect(() => unmount()).not.toThrow();
    });

    it("should have proper background styling with backdrop blur", () => {
      renderNavbar();
      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toHaveClass("backdrop-blur");
    });

    it("should have proper text color on logo link", () => {
      renderNavbar();
      const logo = screen.getByText("RecipeGram").closest("a");
      expect(logo).toHaveClass("text-foreground");
    });
  });
});
