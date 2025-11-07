"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecipeMediaCardProps } from "./RecipeMediaCard.types";
import { ExpandableCaption } from "./ExpandableCaption";
import { RecipeMediaStats } from "./RecipeMediaStats";

export function RecipeMediaCard({ recipe, className }: RecipeMediaCardProps) {
  const poster = recipe.displayUrl || recipe.images?.find(Boolean) || undefined;
  const videoUrl = recipe.videoUrl;
  const title = recipe.recipe_data?.title || "Recipe reel";
  const hasVideo = Boolean(videoUrl);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card",
        className
      )}
    >
      <CardContent className="p-0">
        <AspectRatio ratio={4 / 5}>
          <div className="relative size-full overflow-hidden rounded-2xl bg-muted">
            {isPlaying && hasVideo ? (
              <video
                key="inline-player"
                controls
                autoPlay
                playsInline
                preload="metadata"
                poster={poster}
                className="size-full object-cover"
                aria-label={`Video for ${title}`}
                onEnded={() => setIsPlaying(false)}
              >
                <source src={videoUrl} />
              </video>
            ) : poster ? (
              <>
                <Image
                  src={poster}
                  alt={recipe.alt ?? title}
                  fill
                  sizes="(max-width: 400px) 100vw, 400px"
                  className="object-cover"
                  priority
                />
                {hasVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/40 via-black/10 to-transparent">
                    <Button
                      type="button"
                      size="lg"
                      className="rounded-full bg-white/90 text-foreground shadow-lg transition hover:bg-white"
                      aria-label="Play reel"
                      onClick={() => setIsPlaying(true)}
                    >
                      <Play className="size-4" />
                      Watch reel
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                Media unavailable
              </div>
            )}
          </div>
        </AspectRatio>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-t border-border/60 bg-muted/30 px-6 py-4 text-sm text-muted-foreground">
        <RecipeMediaStats recipe={recipe} />
        {recipe.caption && (
          <ExpandableCaption text={recipe.caption} className="w-full" />
        )}
      </CardFooter>
    </Card>
  );
}
