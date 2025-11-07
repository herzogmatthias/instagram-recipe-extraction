"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { RecipeCard } from "@/components/recipe-card/RecipeCard";
import { FilterBar, FilterState } from "@/components/filter-bar/FilterBar";
import { AddLinkModal } from "@/components/add-link-modal/AddLinkModal";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { useRecipeData } from "@/lib/client/hooks/useRecipeData";
import { useProcessingQueue } from "@/lib/client/hooks/useProcessingQueue";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { RecipeStatus } from "@/models/InstagramRecipePost";
import type { RecipeImportDocument } from "@/models/RecipeImport";
import { toast, Toaster } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

function RecipeCardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="aspect-[3/2] rounded-lg" />
      <Skeleton className="h-5 w-3/4 rounded" />
      <Skeleton className="h-4 w-2/3 rounded" />
      <Skeleton className="h-4 w-1/2 rounded" />
    </div>
  );
}

export default function Home() {
  const { recipes, loading, error } = useRecipeData();
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    selectedCuisines: [],
    selectedTags: [],
    selectedDifficulties: [],
    maxTotalTime: null,
  });
  const [isFilterDialogOpen, setFilterDialogOpen] = useState(false);
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  // Processing queue management
  const {
    queue: processingQueue,
    addToQueue,
    isInQueue,
  } = useProcessingQueue();

  // Only show recipes that have reached "ready" status
  const readyRecipes = useMemo(() => {
    return recipes.filter(
      (recipe) => recipe.status === "ready" || !recipe.status
    );
  }, [recipes]);

  // Handle status changes from polling
  const statusNotificationsRef = useRef(new Map<string, RecipeStatus>());

  useEffect(() => {
    processingQueue.forEach((item) => {
      const previous = statusNotificationsRef.current.get(item.id);
      if (previous !== item.status) {
        statusNotificationsRef.current.set(item.id, item.status);
        if (item.status === "ready") {
          toast.success("Recipe is ready!", {
            description: "Your recipe has been extracted successfully.",
            duration: 5000,
          });
        }
      }
    });

    statusNotificationsRef.current.forEach((_status, id) => {
      if (!processingQueue.some((item) => item.id === id)) {
        statusNotificationsRef.current.delete(id);
      }
    });
  }, [processingQueue]);

  // Listen to custom events from LayoutNavbar
  useEffect(() => {
    const handleOpenAddModal = () => setAddModalOpen(true);
    const handleOpenFilters = () => setFilterDialogOpen(true);

    window.addEventListener("openAddRecipeModal", handleOpenAddModal);
    window.addEventListener("openFiltersDialog", handleOpenFilters);

    return () => {
      window.removeEventListener("openAddRecipeModal", handleOpenAddModal);
      window.removeEventListener("openFiltersDialog", handleOpenFilters);
    };
  }, []);

  const handleAddRecipeSubmit = useCallback(
    async ({ url }: { url: string }) => {
      try {
        // Show processing popover

        // Call the API to create the recipe
        const response = await fetch("/api/recipes/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const message =
            payload &&
            typeof (payload as { error?: unknown }).error === "string"
              ? ((payload as { error?: string }).error as string)
              : "Failed to add recipe.";

          // Handle duplicate recipe case (409 Conflict)
          if (response.status === 409) {
            toast.error("Duplicate recipe", {
              description: message,
              duration: 5000,
            });
            return; // Don't throw - this is a handled case
          }

          throw new Error(message);
        }

        const importDoc = payload as RecipeImportDocument;

        if (!isInQueue(importDoc.id)) {
          addToQueue(importDoc);
        }

        toast.success("Recipe added to queue", {
          description: "Your recipe is being processed.",
          duration: 3000,
        });
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to add recipe.");
      }
    },
    [addToQueue, isInQueue]
  );

  const { cuisines, tags, difficulties } = useMemo(() => {
    const cuisineSet = new Set<string>();
    const tagSet = new Set<string>();
    const difficultySet = new Set<string>();

    readyRecipes.forEach((recipe) => {
      if (recipe.recipe_data?.cuisine) {
        cuisineSet.add(recipe.recipe_data.cuisine);
      }
      if (recipe.hashtags) {
        recipe.hashtags.forEach((tag: string) => {
          if (tag && tag.trim()) {
            tagSet.add(tag.trim());
          }
        });
      }
      if (recipe.recipe_data?.difficulty) {
        difficultySet.add(recipe.recipe_data.difficulty);
      }
    });

    return {
      cuisines: Array.from(cuisineSet).sort(),
      tags: Array.from(tagSet).sort(),
      difficulties: Array.from(difficultySet).sort(),
    };
  }, [readyRecipes]);

  const filteredRecipes = useMemo(() => {
    return readyRecipes.filter((recipe) => {
      if (filters.searchQuery.trim() !== "") {
        const searchLower = filters.searchQuery.toLowerCase();
        const title = recipe.recipe_data?.title || "";
        const caption = recipe.caption || "";

        const matchesSearch =
          title.toLowerCase().includes(searchLower) ||
          caption.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      if (filters.selectedCuisines.length > 0) {
        const recipeCuisine = recipe.recipe_data?.cuisine;
        if (
          !recipeCuisine ||
          !filters.selectedCuisines.includes(recipeCuisine)
        ) {
          return false;
        }
      }

      if (filters.selectedTags.length > 0) {
        const recipeTags = recipe.hashtags;
        if (!recipeTags || recipeTags.length === 0) {
          return false;
        }

        const recipeTagsLower = recipeTags.map((tag: string) =>
          tag.toLowerCase()
        );
        const hasMatchingTag = filters.selectedTags.some((selectedTag) =>
          recipeTagsLower.includes(selectedTag.toLowerCase())
        );

        if (!hasMatchingTag) return false;
      }

      if (filters.selectedDifficulties.length > 0) {
        const recipeDifficulty = recipe.recipe_data?.difficulty;
        if (
          !recipeDifficulty ||
          !filters.selectedDifficulties.includes(recipeDifficulty)
        ) {
          return false;
        }
      }

      if (filters.maxTotalTime !== null && filters.maxTotalTime !== undefined) {
        const recipeTotalTime = recipe.recipe_data?.total_time_min;
        if (!recipeTotalTime || recipeTotalTime > filters.maxTotalTime) {
          return false;
        }
      }

      return true;
    });
  }, [readyRecipes, filters]);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleAddClick = useCallback(() => {
    setAddModalOpen(true);
  }, []);

  const showFilter = !loading && readyRecipes.length > 0;
  const showNoResults =
    !loading && filteredRecipes.length === 0 && readyRecipes.length > 0;
  const showEmptyState = !loading && readyRecipes.length === 0 && !error;
  const showGrid = !loading && filteredRecipes.length > 0;

  const handleRecipeDeleted = useCallback(() => {
    // Firestore listeners update the UI automatically.
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      <main className="pt-8 pb-20">
        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-14 px-6 sm:px-8 lg:px-12 2xl:max-w-[2000px]">
          <header className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center md:gap-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-foreground/60">
                Dashboard
              </p>
              <h1 className="text-3xl font-heading font-bold text-foreground md:text-4xl">
                Your Instagram recipes, organized
              </h1>
            </div>
            <p className="max-w-3xl text-base text-foreground/70 md:text-lg">
              Drop in any Instagram food post and our AI extracts ingredients,
              steps, cook time, and pro tips. Filter the outcomes by cuisine or
              tags to build the cookbook that matches your feed.
            </p>
          </header>

          {error && (
            <div
              className="mx-auto w-full max-w-3xl rounded-xl border border-destructive bg-destructive/10 p-6 text-destructive"
              role="alert"
              data-testid="error-state"
            >
              <p className="font-semibold">Failed to load recipes</p>
              <p className="text-sm">{error.message}</p>
            </div>
          )}

          {loading && (
            <div
              className="mx-auto w-full max-w-6xl grid gap-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:gap-16"
              data-testid="loading-state"
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <RecipeCardSkeleton key={index} />
              ))}
            </div>
          )}

          <div
            className={cn(
              "flex flex-col gap-14",
              showFilter &&
                "lg:grid lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] lg:items-start lg:gap-16 2xl:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]"
            )}
          >
            {showFilter && (
              <aside
                className="hidden lg:sticky lg:top-32 lg:block"
                data-testid="filter-bar-container"
              >
                <FilterBar
                  cuisines={cuisines}
                  tags={tags}
                  difficulties={difficulties}
                  onFilterChange={handleFilterChange}
                  variant="sidebar"
                  value={filters}
                  className="shadow-sm w-full max-w-[280px] 2xl:max-w-[320px]"
                />
              </aside>
            )}

            <section
              className={cn(
                "flex-1 space-y-12",
                (!showFilter || showEmptyState) && "mx-auto w-full max-w-4xl"
              )}
            >
              {!loading && (
                <>
                  {showNoResults && (
                    <div
                      className="mx-auto w-full max-w-3xl rounded-2xl border-2 border-dashed border-border bg-card/90 p-12 text-center"
                      data-testid="no-results-state"
                    >
                      <div className="mb-6 space-y-3">
                        <h3 className="text-xl font-heading font-semibold text-foreground">
                          No recipes found
                        </h3>
                        <p className="text-base text-foreground/60">
                          Try loosening your filters or search query to see more
                          of your saved recipes.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFilters({
                            searchQuery: "",
                            selectedCuisines: [],
                            selectedTags: [],
                            selectedDifficulties: [],
                            maxTotalTime: null,
                          });
                        }}
                        data-testid="clear-filters-button"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}

                  {showEmptyState && (
                    <div
                      className="mx-auto w-full max-w-3xl rounded-2xl border-2 border-dashed border-border bg-card/90 p-12 text-center"
                      data-testid="empty-state"
                    >
                      <div className="mb-8 space-y-3">
                        <h2 className="text-2xl font-heading font-bold text-foreground md:text-3xl">
                          No recipes yet
                        </h2>
                        <p className="text-base text-foreground/60">
                          Add your first Instagram recipe post to kick off your
                          personalized cookbook.
                        </p>
                      </div>
                      <Button
                        onClick={handleAddClick}
                        size="lg"
                        className="gap-2"
                        data-testid="empty-state-add-button"
                      >
                        <Plus className="h-5 w-5" />
                        Add Your First Recipe
                      </Button>
                    </div>
                  )}

                  {showGrid && (
                    <div
                      className="grid grid-cols-1 gap-12 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 2xl:gap-16"
                      data-testid="recipe-grid"
                    >
                      {filteredRecipes.map((recipe) => (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          onDeleted={handleRecipeDeleted}
                          data-testid={`recipe-card-${recipe.id}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      <Button
        onClick={handleAddClick}
        size="icon-lg"
        className="fixed bottom-5 right-5 z-40 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-xl transition-shadow hover:bg-primary/90 hover:shadow-2xl sm:bottom-8 sm:right-8 md:hidden"
        aria-label="Add recipe from Instagram"
        data-testid="fab-add-recipe"
      >
        <Plus className="h-7 w-7" />
      </Button>

      <Dialog open={isFilterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent
          className="flex h-dvh w-full max-w-none flex-col overflow-hidden rounded-none border-none bg-card p-0 sm:h-[calc(100vh-2rem)] sm:max-w-[min(420px,100%-2rem)] sm:rounded-2xl sm:border"
          showCloseButton={false}
        >
          <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
            <DialogTitle className="text-base font-semibold">
              Refine your cookbook
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <FilterBar
              cuisines={cuisines}
              tags={tags}
              difficulties={difficulties}
              onFilterChange={handleFilterChange}
              variant="modal"
              value={filters}
            />
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              className="w-full"
              onClick={() => setFilterDialogOpen(false)}
            >
              Apply filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddLinkModal
        open={isAddModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleAddRecipeSubmit}
      />
    </div>
  );
}
