import Link from "next/link";
import { CalendarDays, Bookmark, Share2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecipeDetailHeaderProps } from "./RecipeDetailHeader.types";
import { formatConfidence, formatTimestamp } from "./RecipeDetailHeader.utils";

export function RecipeDetailHeader({
  recipe,
  className,
}: RecipeDetailHeaderProps) {
  const confidence = formatConfidence(recipe.recipe_data?.confidence);
  const authorHandle = `@${recipe.ownerUsername}`;
  const title = recipe.recipe_data?.title || recipe.caption || "Recipe";
  const publishedAt = formatTimestamp(recipe.timestamp);
  const postUrl = recipe.url || recipe.inputUrl;

  return (
    <header
      className={cn(
        "rounded-3xl border border-border bg-card px-6 py-5 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {recipe.ownerFullName ? (
              <>
                <span className="font-medium text-foreground">
                  {recipe.ownerFullName}
                </span>{" "}
                <span className="text-muted-foreground/80">{authorHandle}</span>
              </>
            ) : (
              <span className="font-medium text-foreground">
                {authorHandle}
              </span>
            )}
          </p>
          <h1 className="mt-1 text-3xl font-heading font-bold leading-tight text-foreground sm:text-4xl">
            {title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label="Save recipe (coming soon)"
            disabled
          >
            <Bookmark className="size-4" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Share recipe (coming soon)"
            disabled
          >
            <Share2 className="size-4" />
            Share
          </Button>
          <Button asChild size="sm">
            <Link href={postUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Open IG
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {confidence && (
          <Badge
            variant="secondary"
            className="bg-primary/20 text-primary-foreground"
          >
            Confidence {confidence}
          </Badge>
        )}
        {recipe.productType && (
          <Badge variant="outline" className="uppercase tracking-wide">
            {recipe.productType}
          </Badge>
        )}
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          <span>{publishedAt ?? "Timestamp unavailable"}</span>
        </div>
      </div>
    </header>
  );
}
