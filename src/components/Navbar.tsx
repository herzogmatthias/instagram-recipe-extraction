"use client";

import { useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Moon,
  Sun,
  Home,
  Clock,
  Settings,
  Plus,
  Filter,
  Ellipsis,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ProcessingQueuePopover,
  type ProcessingQueueItem,
} from "./ProcessingQueuePopover";

interface NavbarProps {
  className?: string;
  onAddRecipe?: () => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  processingItems: ProcessingQueueItem[];
  processingOpen: boolean;
  onProcessingOpenChange: (open: boolean) => void;
  onRemoveFromQueue?: (id: string) => void;
  onRetryFromQueue?: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onAddRecipe,
  onOpenFilters,
  activeFilterCount = 0,
  processingItems,
  processingOpen,
  onProcessingOpenChange,
  onRemoveFromQueue,
  onRetryFromQueue,
}) => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const itemCount = processingItems.length;
  const hasItems = itemCount > 0;
  const badgeLabel = hasItems
    ? itemCount > 9
      ? "9+"
      : itemCount.toString()
    : null;

  const processingTrigger = (
    <button
      type="button"
      data-testid="nav-processing"
      aria-expanded={processingOpen}
      className={cn(
        "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "md:h-auto md:w-auto md:gap-2 md:border-0 md:px-5 md:py-2.5 md:text-sm md:font-medium md:hover:bg-accent/40"
      )}
    >
      <Clock className="h-5 w-5 md:h-4 md:w-4" />
      <span className="hidden md:inline">Processing</span>
      {badgeLabel && (
        <>
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold leading-none text-primary-foreground md:hidden">
            {badgeLabel}
          </span>
          <span className="ml-1 hidden md:inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-primary-foreground">
            {badgeLabel}
          </span>
        </>
      )}
    </button>
  );

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="h-full mx-auto flex max-w-[1600px] items-center justify-between px-7 sm:px-9 lg:px-14">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full px-4 py-2 font-heading text-xl font-semibold text-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
          >
            RecipeGram
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden md:inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="nav-library"
          >
            <Home className="w-4 h-4" />
            Library
          </Link>

          <ProcessingQueuePopover
            open={processingOpen}
            onOpenChange={onProcessingOpenChange}
            items={processingItems}
            trigger={processingTrigger}
            onRemoveItem={onRemoveFromQueue}
            onRetryItem={onRetryFromQueue}
          />

          <Link
            href="/settings"
            className="hidden md:inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="nav-settings"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>

          <div className="flex items-center gap-2 md:hidden">
            {onOpenFilters && (
              <button
                type="button"
                onClick={onOpenFilters}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={
                  activeFilterCount > 0
                    ? `Show filters (${activeFilterCount} applied)`
                    : "Show filters"
                }
                data-testid="mobile-filter-toggle"
              >
                <Filter className="h-5 w-5" />
                <span className="sr-only">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold leading-none text-primary-foreground">
                    {Math.min(activeFilterCount, 9)}
                  </span>
                )}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open navigation menu"
                  data-testid="nav-overflow-mobile"
                >
                  <Ellipsis className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href="/"
                    data-testid="nav-library-mobile"
                    className="flex items-center gap-3"
                  >
                    <Home className="h-4 w-4" />
                    <span>Library</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onProcessingOpenChange(true);
                  }}
                  data-testid="nav-processing-mobile"
                  className="flex items-center gap-3"
                >
                  <Clock className="h-4 w-4" />
                  <span>Processing</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    data-testid="nav-settings-mobile"
                    className="flex items-center gap-3"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {onAddRecipe && (
            <Button
              onClick={onAddRecipe}
              size="lg"
              className="hidden md:inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
              data-testid="nav-add-recipe"
            >
              <Plus className="h-4 w-4" />
              Add Recipe
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="theme-toggle"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="shrink-0 rounded-full hover:bg-accent/30"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
