import { cn } from "@/lib/utils";
import { formatCount, formatDuration } from "./RecipeMediaStats.utils";
import type { RecipeMediaStatsProps } from "./RecipeMediaStats.types";

export function RecipeMediaStats({ recipe, className }: RecipeMediaStatsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 text-sm text-muted-foreground",
        className
      )}
    >
      <MediaStat
        label="Duration"
        value={formatDuration(recipe.videoDuration)}
      />
      <MediaStat
        label="Views"
        value={formatCount(
          recipe.videoViewCount ?? recipe.videoPlayCount ?? null
        )}
      />
      <MediaStat label="Likes" value={formatCount(recipe.likesCount)} />
      <MediaStat label="Comments" value={formatCount(recipe.commentsCount)} />
    </div>
  );
}

function MediaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[96px]">
      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      <p className="text-base font-medium text-foreground">{value}</p>
    </div>
  );
}
