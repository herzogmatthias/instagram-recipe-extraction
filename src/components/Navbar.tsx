"use client";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Moon, Sun, Home, Clock, Settings } from "lucide-react";
import Link from "next/link";

interface NavbarProps {
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  searchPlaceholder = "Search recipes...",
}) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (!onSearch) return;

    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  if (!mounted) {
    return null;
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border h-16"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="h-full container mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="font-heading text-xl font-semibold text-foreground hover:text-primary transition-colors"
          >
            RecipeGram
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            data-testid="nav-library"
          >
            <Home className="w-4 h-4" />
            Library
          </Link>
          <Link
            href="/processing"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            data-testid="nav-processing"
          >
            <Clock className="w-4 h-4" />
            Processing
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            data-testid="nav-settings"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9"
            data-testid="search-input"
            aria-label="Search recipes"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          data-testid="theme-toggle"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="shrink-0"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
