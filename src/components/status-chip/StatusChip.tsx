import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared/utils/utils";
import type { StatusChipProps } from "./StatusChip.types";
import { STATUS_STYLES } from "./StatusChip.utils";

export function StatusChip({ status, className }: StatusChipProps) {
  const config = STATUS_STYLES[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border px-3 py-1 rounded-full",
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

export type { StatusChipProps } from "./StatusChip.types";
export type { RecipeStatus } from "@/models/InstagramRecipePost";
