"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  extractTitle,
  formatMetaPills,
} from "@/lib/shared/utils/recipeHelpers";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  Copy,
  Download,
  MoreVertical,
  ListOrdered,
  Link2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/shared/utils/utils";
import type { RecipeCardProps } from "./RecipeCard.types";
import { StatusChip } from "@/components/status-chip/StatusChip";
import {
  copyToClipboard,
  exportRecipeJson,
  formatIngredientsForCopy,
  formatStepsForCopy,
  getExportFileName,
  deriveCoverUrl,
  getFallbackInitial,
  getRecipeErrorMessage,
  shouldShowErrorBadge,
} from "./RecipeCard.utils";

export function RecipeCard({
  recipe,
  onClick,
  className,
  onDeleted,
}: RecipeCardProps) {
  const computedTitle = extractTitle(recipe);
  const titleRef = useRef(computedTitle);
  if (
    computedTitle &&
    computedTitle !== "Untitled Recipe" &&
    titleRef.current !== computedTitle
  ) {
    titleRef.current = computedTitle;
  }
  const title = computedTitle || titleRef.current || "Untitled Recipe";
  const metaPills = formatMetaPills(recipe);
  const displayTags = recipe.recipe_data?.tags?.slice(0, 3) || [];
  const remainingTagsCount = (recipe.recipe_data?.tags?.length || 0) - 3;
  const hasRecipeData = Boolean(recipe.recipe_data);
  const hasIngredients = Boolean(recipe.recipe_data?.ingredients?.length);
  const hasSteps = Boolean(recipe.recipe_data?.steps?.length);
  const canViewPost = Boolean(recipe.url || recipe.inputUrl);
  const router = useRouter();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastGoodCoverRef = useRef<string | null>(deriveCoverUrl(recipe));
  const derivedCover = deriveCoverUrl(recipe);
  if (derivedCover && lastGoodCoverRef.current !== derivedCover) {
    lastGoodCoverRef.current = derivedCover;
  }
  const coverUrl = derivedCover ?? lastGoodCoverRef.current;
  const placeholderInitial = getFallbackInitial(title);
  const showErrorBadge = shouldShowErrorBadge(recipe);
  const errorMessage = getRecipeErrorMessage(recipe);
  const isFailed = recipe.status === "failed";
  const isProcessing =
    recipe.status && !["ready", "failed"].includes(recipe.status);

  const exportFileName = useMemo(
    () => getExportFileName(recipe.id, title),
    [recipe.id, title]
  );

  const buildIngredientsText = useCallback(
    () => formatIngredientsForCopy(recipe.recipe_data?.ingredients),
    [recipe.recipe_data?.ingredients]
  );

  const buildStepsText = useCallback(
    () => formatStepsForCopy(recipe.recipe_data?.steps),
    [recipe.recipe_data?.steps]
  );

  const handleOpenRecipe = useCallback(() => {
    if (!hasRecipeData) return;
    router.push(`/recipes/${recipe.id}`);
  }, [hasRecipeData, recipe.id, router]);

  const handleCopyIngredients = useCallback(async () => {
    if (!hasIngredients) return;
    const ingredientsText = buildIngredientsText();
    await copyToClipboard(
      ingredientsText,
      `${title} ingredients copied to clipboard.`
    );
  }, [buildIngredientsText, hasIngredients, title]);

  const handleCopySteps = useCallback(async () => {
    if (!hasSteps) return;
    const stepsText = buildStepsText();
    await copyToClipboard(stepsText, `${title} steps copied to clipboard.`);
  }, [buildStepsText, hasSteps, title]);

  const handleExportJson = useCallback(() => {
    if (!recipe.recipe_data) return;
    exportRecipeJson(recipe.recipe_data, exportFileName);
  }, [exportFileName, recipe.recipe_data]);

  const handleViewPost = useCallback(() => {
    if (!canViewPost) {
      toast.error("Instagram URL is not available for this recipe.");
      return;
    }
    const postUrl = recipe.url || recipe.inputUrl;
    if (typeof window !== "undefined") {
      window.open(postUrl, "_blank", "noopener,noreferrer");
    }
  }, [canViewPost, recipe.inputUrl, recipe.url]);

  const handleConfirmDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });

      let payload: { error?: string } | null = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message = payload?.error || "Failed to delete recipe.";
        throw new Error(message);
      }

      toast.success("Recipe deleted.");
      setDeleteDialogOpen(false);
      onDeleted?.(recipe.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete recipe.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [onDeleted, recipe.id]);

  const deleteDescription = title || "this recipe";

  return (
    <>
      <Card
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-lg transition-all duration-200 p-0 gap-0",
          "hover:-translate-y-1 hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "cursor-pointer",
          isFailed && "border border-destructive/40 shadow-destructive/30",
          className
        )}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {/* Media Section with 3:2 aspect ratio */}
        <AspectRatio
          ratio={3 / 2}
          className="relative overflow-hidden bg-muted"
        >
          {recipe.status && (
            <div className="absolute left-4 top-4 z-20">
              <StatusChip status={recipe.status} />
            </div>
          )}

          {showErrorBadge && (
            <div className="absolute right-4 top-4 z-20">
              <Badge
                variant="destructive"
                title={errorMessage ?? undefined}
                aria-label={
                  errorMessage
                    ? `Recipe error: ${errorMessage}`
                    : "Recipe error"
                }
                data-testid="error-badge"
              >
                Error
              </Badge>
            </div>
          )}

          {coverUrl ? (
            <>
              <Image
                src={coverUrl}
                alt={title}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              {/* Gradient overlay at bottom - ensuring 4.5:1 contrast */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
            </>
          ) : (
            <div
              className="flex h-full items-center justify-center bg-gradient-to-br from-muted-foreground/40 via-muted-foreground/20 to-muted"
              data-testid="cover-placeholder"
            >
              <span className="text-3xl font-semibold text-white">
                {placeholderInitial}
              </span>
              <span className="sr-only">Recipe cover placeholder</span>
            </div>
          )}

          {isProcessing && typeof recipe.progress === "number" && (
            <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-4">
              <Progress
                value={Math.max(0, Math.min(100, recipe.progress))}
                className="h-1.5 rounded-full bg-white/20"
                aria-label="Processing progress"
              />
            </div>
          )}

          {/* Title overlay - bottom with enhanced contrast */}
          <div className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-10">
            <h3 className="text-lg font-semibold leading-snug line-clamp-2 font-heading text-white [text-shadow:_0_1px_8px_rgb(0_0_0_/_80%)]">
              {title}
            </h3>
          </div>
        </AspectRatio>

        {/* Body Section */}
        <CardContent className="flex flex-1 flex-col gap-4 px-6 py-5">
          {/* Meta Pills */}
          {metaPills.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="meta-pills">
              {metaPills.map((pill, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-foreground/80"
                >
                  {pill}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="min-h-[2.125rem]" aria-hidden="true" />
          )}

          {/* Tags */}
          {displayTags.length > 0 || remainingTagsCount > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="recipe-tags">
              {displayTags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="rounded-full px-3 py-1 text-xs font-medium text-foreground/80"
                >
                  {tag}
                </Badge>
              ))}
              {remainingTagsCount > 0 && (
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-xs font-medium text-foreground/80"
                >
                  +{remainingTagsCount}
                </Badge>
              )}
            </div>
          ) : (
            <div className="min-h-[2.125rem]" aria-hidden="true" />
          )}
        </CardContent>

        {/* Footer Actions */}
        <CardFooter className="justify-between border-t px-6 py-4">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full"
              disabled={!hasRecipeData}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenRecipe();
              }}
              aria-label="Open recipe"
            >
              <ExternalLink className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full"
              disabled={!hasIngredients}
              onClick={(e) => {
                e.stopPropagation();
                void handleCopyIngredients();
              }}
              aria-label="Copy ingredients"
            >
              <Copy className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full"
              disabled={!hasSteps}
              onClick={(e) => {
                e.stopPropagation();
                void handleCopySteps();
              }}
              aria-label="Copy steps"
            >
              <ListOrdered className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full"
              disabled={!hasRecipeData}
              onClick={(e) => {
                e.stopPropagation();
                handleExportJson();
              }}
              aria-label="Export recipe as JSON"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={(e) => e.stopPropagation()}
                aria-label="More actions"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  handleViewPost();
                }}
                disabled={!canViewPost}
              >
                <Link2 className="h-4 w-4" />
                View Instagram Post
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  setDeleteDialogOpen(true);
                }}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete recipe
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete recipe?</DialogTitle>
            <DialogDescription>
              This will permanently remove {deleteDescription}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleConfirmDelete();
              }}
              disabled={isDeleting}
              aria-busy={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type { RecipeCardProps } from "./RecipeCard.types";
