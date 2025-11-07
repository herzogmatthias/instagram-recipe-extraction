"use client";

import { useCallback } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WatchReelFabProps } from "./WatchReelFab.types";

export function WatchReelFab({
  targetId = "media",
  className,
}: WatchReelFabProps) {
  const handleClick = useCallback(() => {
    if (!targetId) return;
    const anchor = document.getElementById(targetId);
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [targetId]);

  return (
    <Button
      type="button"
      size="lg"
      variant="secondary"
      className={cn(
        "fixed bottom-24 right-4 z-40 shadow-lg md:hidden",
        className
      )}
      aria-controls={targetId}
      aria-label="Play reel"
      onClick={handleClick}
    >
      <Play className="size-4" />
      Watch reel
    </Button>
  );
}
