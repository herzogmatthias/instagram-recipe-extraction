"use client";

import Link from "next/link";
import { CalendarDays, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { RecipeSourceQualityCardProps } from "./RecipeSourceQualityCard.types";

export function RecipeSourceQualityCard({
  recipe,
}: RecipeSourceQualityCardProps) {
  const confidence = recipe.recipe_data?.confidence ?? null;
  const assumptions = recipe.recipe_data?.assumptions ?? [];
  const postUrl = recipe.url || recipe.inputUrl;
  const publishedAt = recipe.timestamp
    ? new Date(recipe.timestamp).toLocaleString()
    : null;
  const music = recipe.musicInfo;

  return (
    <Card className={cn("rounded-2xl border border-border bg-card shadow-sm")}>
      <CardHeader className="pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
          Source & quality
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {confidence !== null && (
          <Badge
            variant="secondary"
            className="bg-primary/20 text-primary-foreground"
          >
            Confidence{" "}
            {Math.round(confidence > 1 ? confidence : confidence * 100)}%
          </Badge>
        )}

        {publishedAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            <span>{publishedAt}</span>
          </div>
        )}

        <div className="text-sm">
          <Link
            href={postUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            View Instagram post <ExternalLink className="size-4" />
          </Link>
        </div>

        {music && (
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {music.song_name && (
              <p>
                Song: <span className="text-foreground">{music.song_name}</span>
              </p>
            )}
            {music.artist_name && (
              <p>
                Artist:{" "}
                <span className="text-foreground">{music.artist_name}</span>
              </p>
            )}
          </div>
        )}

        {assumptions.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="assumptions">
              <AccordionTrigger className="text-sm">
                Gemini assumptions
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {assumptions.map((a, idx) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
