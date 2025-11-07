"use client";

import { memo } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RecipeMediaInlineProps } from "./RecipeMediaInline.types";
import { RecipeMediaStats } from "../recipe-media-stats/RecipeMediaStats";
import { ExpandableCaption } from "@/components/expandable-caption/ExpandableCaption";

export const RecipeMediaInline = memo(function RecipeMediaInline({
  recipe,
  id = "media",
  className,
}: RecipeMediaInlineProps) {
  const videoUrl = recipe.videoUrl;
  const poster = recipe.displayUrl || recipe.images?.find(Boolean) || undefined;

  if (!videoUrl) return null;

  return (
    <Card
      id={id}
      className={cn(
        "md:hidden overflow-hidden rounded-3xl border border-border bg-card shadow-sm",
        className
      )}
      aria-label="Recipe reel"
    >
      <CardContent className="p-0">
        <video
          controls
          playsInline
          preload="metadata"
          poster={poster}
          className="w-full max-h-[45vh] rounded-b-none rounded-t-3xl object-cover"
        >
          <source src={videoUrl} />
        </video>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-t border-border/60 bg-muted/30 px-5 py-4">
        <RecipeMediaStats recipe={recipe} />
        {recipe.caption && (
          <ExpandableCaption text={recipe.caption} className="w-full" />
        )}
      </CardFooter>
    </Card>
  );
});
