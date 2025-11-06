import { RecipeStatus } from "@/models/InstagramRecipePost";

export const STATUS_LABELS: Record<RecipeStatus, string> = {
  queued: "Queued",
  scraping: "Scraping",
  downloading_media: "Downloading",
  uploading_media: "Uploading",
  extracting: "Extracting",
  ready: "Ready",
  failed: "Failed",
};

export const STATUS_BADGE_VARIANT: Record<
  RecipeStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  queued: "outline",
  scraping: "default",
  downloading_media: "default",
  uploading_media: "default",
  extracting: "default",
  ready: "secondary",
  failed: "destructive",
};

export function formatCreatedAt(timestamp?: string | null): string {
  if (!timestamp) {
    return "Just now";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
