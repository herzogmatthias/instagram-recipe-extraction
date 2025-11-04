import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RecipeStatus =
  | "queued"
  | "scraping"
  | "downloading_media"
  | "uploading_media"
  | "extracting"
  | "ready"
  | "failed";

interface StatusChipProps {
  status: RecipeStatus;
  className?: string;
}

const statusConfig: Record<
  RecipeStatus,
  { label: string; color: string; bgColor: string }
> = {
  queued: {
    label: "Queued",
    color: "text-gray-700 dark:text-gray-300",
    bgColor:
      "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
  },
  scraping: {
    label: "Scraping",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700",
  },
  downloading_media: {
    label: "Downloading",
    color: "text-purple-700 dark:text-purple-300",
    bgColor:
      "bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700",
  },
  uploading_media: {
    label: "Uploading",
    color: "text-indigo-700 dark:text-indigo-300",
    bgColor:
      "bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700",
  },
  extracting: {
    label: "Extracting",
    color: "text-amber-700 dark:text-amber-300",
    bgColor:
      "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700",
  },
  ready: {
    label: "Ready",
    color: "text-green-700 dark:text-green-300",
    bgColor:
      "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700",
  },
  failed: {
    label: "Failed",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700",
  },
};

export function StatusChip({ status, className }: StatusChipProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border",
        config.color,
        config.bgColor,
        className
      )}
      aria-label={`Recipe status: ${config.label}`}
      role="status"
    >
      {config.label}
    </Badge>
  );
}
