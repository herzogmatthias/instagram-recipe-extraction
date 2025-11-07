"use client";

import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterBarProps } from "./FilterBar.types";
import { hasActiveFilters, toggleSelection } from "./FilterBar.utils";

export function FilterBar({
  cuisines = [],
  tags = [],
  difficulties = [],
  onFilterChange,
  className,
  variant = "inline",
  value,
}: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(
    []
  );
  const [maxTotalTime, setMaxTotalTime] = useState<number | null>(null);
  const isSidebar = variant === "sidebar";
  const isModal = variant === "modal";
  const isControlled = value !== undefined;
  const currentSearchQuery = isControlled ? value!.searchQuery : searchQuery;
  const currentSelectedCuisines = isControlled
    ? value!.selectedCuisines
    : selectedCuisines;
  const currentSelectedTags = isControlled ? value!.selectedTags : selectedTags;
  const currentSelectedDifficulties = isControlled
    ? value!.selectedDifficulties
    : selectedDifficulties;
  const currentMaxTotalTime = isControlled
    ? value!.maxTotalTime ?? null
    : maxTotalTime;

  // Notify parent of filter changes
  const notifyFilterChange = useCallback(
    (
      newSearch: string,
      newCuisines: string[],
      newTags: string[],
      newDifficulties: string[],
      newMaxTime: number | null
    ) => {
      if (onFilterChange) {
        onFilterChange({
          searchQuery: newSearch,
          selectedCuisines: newCuisines,
          selectedTags: newTags,
          selectedDifficulties: newDifficulties,
          maxTotalTime: newMaxTime,
        });
      }
    },
    [onFilterChange]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextSearch = e.target.value;

      if (!isControlled) {
        setSearchQuery(nextSearch);
      }

      notifyFilterChange(
        nextSearch,
        currentSelectedCuisines,
        currentSelectedTags,
        currentSelectedDifficulties,
        currentMaxTotalTime
      );
    },
    [
      isControlled,
      currentSelectedCuisines,
      currentSelectedTags,
      currentSelectedDifficulties,
      currentMaxTotalTime,
      notifyFilterChange,
    ]
  );

  const handleCuisineToggle = useCallback(
    (cuisine: string) => {
      const nextCuisines = toggleSelection(cuisine, currentSelectedCuisines);

      if (!isControlled) {
        setSelectedCuisines(nextCuisines);
      }

      notifyFilterChange(
        currentSearchQuery,
        nextCuisines,
        currentSelectedTags,
        currentSelectedDifficulties,
        currentMaxTotalTime
      );
    },
    [
      isControlled,
      currentSelectedCuisines,
      currentSelectedTags,
      currentSelectedDifficulties,
      currentMaxTotalTime,
      currentSearchQuery,
      notifyFilterChange,
    ]
  );

  const handleTagToggle = useCallback(
    (tag: string) => {
      const nextTags = toggleSelection(tag, currentSelectedTags);

      if (!isControlled) {
        setSelectedTags(nextTags);
      }

      notifyFilterChange(
        currentSearchQuery,
        currentSelectedCuisines,
        nextTags,
        currentSelectedDifficulties,
        currentMaxTotalTime
      );
    },
    [
      isControlled,
      currentSelectedTags,
      currentSelectedCuisines,
      currentSelectedDifficulties,
      currentMaxTotalTime,
      currentSearchQuery,
      notifyFilterChange,
    ]
  );

  const handleDifficultyToggle = useCallback(
    (difficulty: string) => {
      const nextDifficulties = toggleSelection(
        difficulty,
        currentSelectedDifficulties
      );

      if (!isControlled) {
        setSelectedDifficulties(nextDifficulties);
      }

      notifyFilterChange(
        currentSearchQuery,
        currentSelectedCuisines,
        currentSelectedTags,
        nextDifficulties,
        currentMaxTotalTime
      );
    },
    [
      isControlled,
      currentSelectedDifficulties,
      currentSelectedCuisines,
      currentSelectedTags,
      currentMaxTotalTime,
      currentSearchQuery,
      notifyFilterChange,
    ]
  );

  const handleMaxTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const nextMaxTime = value === "" ? null : parseInt(value, 10);

      if (!isControlled) {
        setMaxTotalTime(nextMaxTime);
      }

      notifyFilterChange(
        currentSearchQuery,
        currentSelectedCuisines,
        currentSelectedTags,
        currentSelectedDifficulties,
        nextMaxTime
      );
    },
    [
      isControlled,
      currentSearchQuery,
      currentSelectedCuisines,
      currentSelectedTags,
      currentSelectedDifficulties,
      notifyFilterChange,
    ]
  );

  const handleClearFilters = useCallback(() => {
    if (!isControlled) {
      setSearchQuery("");
      setSelectedCuisines([]);
      setSelectedTags([]);
      setSelectedDifficulties([]);
      setMaxTotalTime(null);
    }
    notifyFilterChange("", [], [], [], null);
  }, [isControlled, notifyFilterChange]);

  const activeFilters = hasActiveFilters({
    searchQuery: currentSearchQuery,
    selectedCuisines: currentSelectedCuisines,
    selectedTags: currentSelectedTags,
    selectedDifficulties: currentSelectedDifficulties,
    maxTotalTime: currentMaxTotalTime,
  });

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card",
        isSidebar && "px-6 py-5 space-y-5",
        variant === "inline" && "px-5 py-4",
        isModal && "h-full space-y-6 border-none bg-background px-1 py-0",
        className
      )}
      role="search"
      aria-label="Recipe filters"
    >
      {isSidebar && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.28em] text-foreground/60">
            Filters
          </p>
          <h2 className="text-lg font-heading font-semibold text-foreground">
            Refine your cookbook
          </h2>
        </div>
      )}

      <div
        className={cn(
          "flex gap-4",
          isSidebar
            ? "flex-col"
            : isModal
            ? "flex-col"
            : "flex-col items-stretch md:flex-row md:items-center md:justify-center md:gap-6"
        )}
      >
        {/* Search input */}
        <div
          className={cn(
            "w-full",
            isSidebar ? "" : isModal ? "" : "md:flex-1 md:max-w-xl"
          )}
        >
          <Input
            type="search"
            placeholder="Search recipes by title, caption, or ingredients"
            value={currentSearchQuery}
            onChange={handleSearchChange}
            className={cn(
              "h-11 w-full rounded-full",
              isSidebar ? "" : isModal ? "" : "shadow-sm"
            )}
            aria-label="Search recipes"
            data-testid="search-input"
          />
        </div>

        {/* Filter controls */}
        <div
          className={cn(
            "flex flex-wrap gap-2",
            isSidebar
              ? ""
              : isModal
              ? ""
              : "items-center justify-center md:gap-3"
          )}
        >
          {/* Cuisine filter dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className={cn(
                  "gap-2 rounded-full px-4",
                  isSidebar || isModal ? "w-full justify-between" : ""
                )}
                data-testid="cuisine-filter-trigger"
                aria-label={`Filter by cuisine${
                  currentSelectedCuisines.length > 0
                    ? ` (${currentSelectedCuisines.length} selected)`
                    : ""
                }`}
              >
                Cuisine
                {currentSelectedCuisines.length > 0 && (
                  <span className="font-semibold text-primary">
                    ({currentSelectedCuisines.length})
                  </span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={cn(
                "w-56",
                isSidebar && "w-64",
                isModal && "w-[min(20rem,90vw)]"
              )}
            >
              <DropdownMenuLabel>Select cuisines</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {cuisines.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No cuisines available
                </div>
              ) : (
                cuisines.map((cuisine) => (
                  <DropdownMenuCheckboxItem
                    key={cuisine}
                    checked={currentSelectedCuisines.includes(cuisine)}
                    onCheckedChange={() => handleCuisineToggle(cuisine)}
                    data-testid={`cuisine-option-${cuisine}`}
                  >
                    {cuisine}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tags filter dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className={cn(
                  "gap-2 rounded-full px-4",
                  isSidebar || isModal ? "w-full justify-between" : ""
                )}
                data-testid="tags-filter-trigger"
                aria-label={`Filter by tags${
                  currentSelectedTags.length > 0
                    ? ` (${currentSelectedTags.length} selected)`
                    : ""
                }`}
              >
                Tags
                {currentSelectedTags.length > 0 && (
                  <span className="font-semibold text-primary">
                    ({currentSelectedTags.length})
                  </span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={cn(
                "w-56 max-h-80 overflow-y-auto",
                isSidebar && "w-64",
                isModal && "w-[min(20rem,90vw)]"
              )}
            >
              <DropdownMenuLabel>Select tags</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tags.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No tags available
                </div>
              ) : (
                tags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={currentSelectedTags.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                    data-testid={`tag-option-${tag}`}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Difficulty filter dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className={cn(
                  "gap-2 rounded-full px-4",
                  isSidebar || isModal ? "w-full justify-between" : ""
                )}
                data-testid="difficulty-filter-trigger"
                aria-label={`Filter by difficulty${
                  currentSelectedDifficulties.length > 0
                    ? ` (${currentSelectedDifficulties.length} selected)`
                    : ""
                }`}
              >
                Difficulty
                {currentSelectedDifficulties.length > 0 && (
                  <span className="font-semibold text-primary">
                    ({currentSelectedDifficulties.length})
                  </span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={cn(
                "w-56",
                isSidebar && "w-64",
                isModal && "w-[min(20rem,90vw)]"
              )}
            >
              <DropdownMenuLabel>Select difficulty</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {difficulties.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No difficulty levels available
                </div>
              ) : (
                difficulties.map((difficulty) => (
                  <DropdownMenuCheckboxItem
                    key={difficulty}
                    checked={currentSelectedDifficulties.includes(difficulty)}
                    onCheckedChange={() => handleDifficultyToggle(difficulty)}
                    data-testid={`difficulty-option-${difficulty}`}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Max time input */}
          <div
            className={cn(
              "flex items-center gap-2",
              isSidebar || isModal ? "w-full" : ""
            )}
          >
            <Input
              type="number"
              placeholder="Max time (min)"
              value={currentMaxTotalTime ?? ""}
              onChange={handleMaxTimeChange}
              min="0"
              step="5"
              className={cn(
                "h-11 rounded-full",
                isSidebar || isModal ? "w-full" : "w-32"
              )}
              aria-label="Maximum total time in minutes"
              data-testid="max-time-input"
            />
          </div>

          {/* Clear filters button */}
          {activeFilters && (
            <Button
              variant="ghost"
              size="default"
              className={cn(
                "gap-2 rounded-full px-4 text-muted-foreground hover:text-foreground",
                isSidebar || isModal ? "w-full justify-center" : ""
              )}
              onClick={handleClearFilters}
              data-testid="clear-filters-button"
              aria-label="Clear all filters"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FilterBar;
export type { FilterBarProps, FilterState } from "./FilterBar.types";
