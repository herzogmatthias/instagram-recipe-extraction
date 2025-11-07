"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { X, RotateCcw } from "lucide-react";
import type { ProcessingQueuePopoverProps } from "./ProcessingQueuePopover.types";
import {
  STATUS_BADGE_VARIANT,
  STATUS_LABELS,
  formatCreatedAt,
} from "./ProcessingQueuePopover.utils";

export function ProcessingQueuePopover({
  open,
  onOpenChange,
  items,
  trigger,
  onViewHistory,
  onRemoveItem,
  onRetryItem,
}: ProcessingQueuePopoverProps) {
  const hasItems = items.length > 0;

  const content = useMemo(
    () => (
      <div className="flex max-h-[60vh] min-h-[180px] w-[360px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="border-b px-5 py-4">
          <p className="text-sm font-semibold text-foreground">
            Processing Queue
          </p>
        </div>

        <div
          className={cn(
            "flex-1 overflow-y-auto px-5",
            hasItems ? "py-4" : "py-8"
          )}
        >
          {hasItems ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-background shadow-sm overflow-hidden"
                >
                  {item.displayUrl && (
                    <div className="relative aspect-[4/3] w-full bg-muted">
                      <Image
                        src={item.displayUrl}
                        alt={item.title || "Recipe preview"}
                        fill
                        className="object-cover"
                        sizes="360px"
                      />
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p
                        className="text-xs font-medium text-foreground line-clamp-1 flex-1"
                        title={item.title || item.url}
                      >
                        {item.title || item.url}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={STATUS_BADGE_VARIANT[item.status]}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                        {item.status === "failed" && onRetryItem && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => onRetryItem(item.id)}
                            aria-label="Retry processing"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry
                          </Button>
                        )}
                        {onRemoveItem && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6 rounded-full"
                            onClick={() => onRemoveItem(item.id)}
                            aria-label="Remove from queue"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Progress value={item.progress} className="h-1.5" />
                    {item.error && item.status === "failed" && (
                      <p className="mt-2 text-xs text-destructive line-clamp-2">
                        {item.error}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-foreground/60">
                      Added {formatCreatedAt(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  No links in progress
                </h3>
                <p className="text-xs text-foreground/60">
                  Add an Instagram link to start parsing. It will appear here
                  while we extract the recipe.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-muted/40 px-5 py-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              onViewHistory?.();
            }}
          >
            View processing history
          </Button>
        </div>
      </div>
    ),
    [hasItems, items, onOpenChange, onViewHistory, onRemoveItem, onRetryItem]
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={false}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-auto border-none bg-transparent p-0"
        align="end"
        side="bottom"
        sideOffset={12}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}

export type {
  ProcessingQueueItem,
  ProcessingQueuePopoverProps,
} from "./ProcessingQueuePopover.types";
