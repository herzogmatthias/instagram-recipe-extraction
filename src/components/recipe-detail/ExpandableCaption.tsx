"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ExpandableCaptionProps = {
  text: string;
  collapsedLength?: number;
  className?: string;
};

const DEFAULT_COLLAPSED_LENGTH = 50;

export function ExpandableCaption({
  text,
  collapsedLength = DEFAULT_COLLAPSED_LENGTH,
  className,
}: ExpandableCaptionProps) {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = text.length > collapsedLength;
  const displayText =
    !isTruncated || expanded
      ? text
      : `${text.slice(0, collapsedLength).trimEnd()}…`;

  return (
    <div className={className}>
      <p className="whitespace-pre-line text-sm text-muted-foreground">
        {displayText}
      </p>
      {isTruncated && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 px-2 text-xs font-semibold text-primary"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Show less" : "Show caption"}
        </Button>
      )}
    </div>
  );
}
