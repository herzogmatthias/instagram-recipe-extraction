"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, RotateCcw } from "lucide-react";
import type { RecipeImportDocument } from "@/models/RecipeImport";
import { cn } from "@/lib/utils";
import { DeleteActionCell } from "./DeleteActionCell";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  queued: "secondary",
  scraping: "default",
  downloading_media: "default",
  uploading_media: "default",
  extracting: "default",
  ready: "default",
  failed: "destructive",
} as const;

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  scraping: "Scraping",
  downloading_media: "Downloading",
  uploading_media: "Uploading",
  extracting: "Extracting",
  ready: "Completed",
  failed: "Failed",
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "Invalid date";
  }
};

const getStatusColor = (status: string) => {
  if (status === "ready") return "text-green-600";
  if (status === "failed") return "text-red-600";
  return "text-blue-600";
};

export type ColumnActionHandlers = {
  onRetry: (importItem: RecipeImportDocument) => void;
  onDelete: (id: string) => void;
  retryingIds: Set<string>;
  deletingIds: Set<string>;
};

export const createColumns = (
  handlers: ColumnActionHandlers
): ColumnDef<RecipeImportDocument>[] => [
  {
    accessorKey: "inputUrl",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          URL
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const url = row.getValue("inputUrl") as string;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline truncate block max-w-xs"
        >
          {url}
        </a>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={STATUS_VARIANT[status]}>
          {STATUS_LABELS[status] || status}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.getValue("progress") as number;
      const status = row.original.status;
      return (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all", getStatusColor(status))}
              style={{
                width: `${progress || 0}%`,
                backgroundColor:
                  status === "ready"
                    ? "#22c55e"
                    : status === "failed"
                    ? "#ef4444"
                    : "#3b82f6",
              }}
            />
          </div>
          <span className="text-xs text-foreground/60">{progress || 0}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="text-sm">{formatDate(row.getValue("createdAt"))}</div>
      );
    },
    filterFn: (row, id, value: { from?: string; to?: string }) => {
      const createdAt = row.getValue(id) as string;
      if (!createdAt) return false;

      const itemDate = new Date(createdAt);

      if (value.from) {
        const fromDate = new Date(value.from);
        fromDate.setHours(0, 0, 0, 0);
        if (itemDate < fromDate) return false;
      }

      if (value.to) {
        const toDate = new Date(value.to);
        toDate.setHours(23, 59, 59, 999);
        if (itemDate > toDate) return false;
      }

      return true;
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="text-sm">{formatDate(row.getValue("updatedAt"))}</div>
      );
    },
  },
  {
    accessorKey: "error",
    header: "Error",
    cell: ({ row }) => {
      const error = row.getValue("error") as string | null;
      return error ? (
        <span className="text-xs text-destructive truncate block max-w-xs">
          {error}
        </span>
      ) : (
        <span className="text-xs text-foreground/40">—</span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const importItem = row.original;

      return (
        <div className="flex items-center justify-end gap-2">
          {importItem.status === "failed" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onRetry(importItem)}
              disabled={handlers.retryingIds.has(importItem.id)}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          )}
          <DeleteActionCell
            importId={importItem.id}
            onDelete={handlers.onDelete}
            isDeleting={handlers.deletingIds.has(importItem.id)}
          />
        </div>
      );
    },
  },
];
