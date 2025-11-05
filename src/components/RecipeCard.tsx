"use client";

import { InstagramRecipePost } from "@/models/InstagramRecipePost";
import { extractTitle, formatMetaPills } from "@/lib/utils/recipeHelpers";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ExternalLink, Copy, Download, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface RecipeCardProps {
  recipe: InstagramRecipePost;
  onClick?: () => void;
  className?: string;
}

export function RecipeCard({ recipe, onClick, className }: RecipeCardProps) {
  const title = extractTitle(recipe);
  const metaPills = formatMetaPills(recipe);
  const displayTags = recipe.recipe_data?.tags?.slice(0, 3) || [];
  const remainingTagsCount = (recipe.recipe_data?.tags?.length || 0) - 3;
  const hasRecipeData = Boolean(recipe.recipe_data);
  const hasIngredients = Boolean(recipe.recipe_data?.ingredients?.length);

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg transition-all duration-200 p-0 gap-0",
        "hover:-translate-y-1 hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "cursor-pointer",
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
      <AspectRatio ratio={3 / 2} className="overflow-hidden bg-muted">
        {recipe.displayUrl ? (
          <>
            <Image
              src={recipe.displayUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {/* Gradient overlay at bottom - ensuring 4.5:1 contrast */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <div className="h-12 w-12 animate-pulse rounded-lg bg-muted-foreground/20" />
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
              // Handle open action
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
              // Handle copy ingredients
            }}
            aria-label="Copy ingredients"
          >
            <Copy className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            disabled={!hasRecipeData}
            onClick={(e) => {
              e.stopPropagation();
              // Handle export JSON
            }}
            aria-label="Export recipe as JSON"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            // Handle menu
          }}
          aria-label="More actions"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
