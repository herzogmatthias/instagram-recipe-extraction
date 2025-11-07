"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { RecipeImportDocument } from "@/models/RecipeImport";
import { SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { HistoryTable } from "@/components/history-table/HistoryTable";
import { HistoryFiltersComponent } from "@/components/history-table/HistoryFilters";
import type { ColumnActionHandlers } from "@/components/history-table/columns";
import type { HistoryFilters } from "@/components/history-table/HistoryTable.types";
import { useProcessingQueue } from "@/lib/client/hooks/useProcessingQueue";

export default function HistoryPage() {
  const router = useRouter();
  const { addToQueue, isInQueue } = useProcessingQueue();
  const [imports, setImports] = useState<RecipeImportDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filters, setFilters] = useState<HistoryFilters>({
    status: [],
    dateFrom: "",
    dateTo: "",
  });

  const fetchImports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/recipes/import");
      if (!response.ok) {
        throw new Error("Failed to fetch import history");
      }
      const data = await response.json();
      setImports(data.imports || []);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch imports")
      );
      toast.error("Failed to load import history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id));
      try {
        const response = await fetch(
          `/api/recipes/import/${id}?permanent=true`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to delete import");
        }

        toast.success("Import deleted successfully");
        await fetchImports();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete import";
        toast.error(message);
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [fetchImports]
  );

  const handleRetry = useCallback(
    async (importItem: RecipeImportDocument) => {
      setRetryingIds((prev) => new Set(prev).add(importItem.id));
      try {
        const response = await fetch("/api/recipes/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: importItem.inputUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to retry import");
        }

        const newImportDoc = (await response.json()) as RecipeImportDocument;

        // Add the new import to the processing queue
        if (!isInQueue(newImportDoc.id)) {
          addToQueue(newImportDoc);
        }

        toast.success("Import restarted successfully");
        await fetchImports();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to retry import";
        toast.error(message);
      } finally {
        setRetryingIds((prev) => {
          const next = new Set(prev);
          next.delete(importItem.id);
          return next;
        });
      }
    },
    [fetchImports, addToQueue, isInQueue]
  );

  // Sync filters with column filters
  useMemo(() => {
    const newColumnFilters: ColumnFiltersState = [];

    if (filters.status.length > 0) {
      newColumnFilters.push({ id: "status", value: filters.status });
    }

    if (filters.dateFrom || filters.dateTo) {
      newColumnFilters.push({
        id: "createdAt",
        value: { from: filters.dateFrom, to: filters.dateTo },
      });
    }

    setColumnFilters(newColumnFilters);
  }, [filters]);

  // Create columns with action handlers
  const actionHandlers: ColumnActionHandlers = {
    onRetry: handleRetry,
    onDelete: handleDelete,
    retryingIds,
    deletingIds,
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <Toaster position="top-right" />

      <div className="mx-auto max-w-[1600px] px-6 py-8 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">
              Processing History
            </h1>
            <p className="text-sm text-foreground/60 mt-1">
              View and manage all recipe import attempts
            </p>
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={fetchImports}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        <HistoryFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
        />

        {error && (
          <div
            className="mb-6 rounded-xl border border-destructive bg-destructive/10 p-6 text-destructive"
            role="alert"
          >
            <p className="font-semibold">Error loading history</p>
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {loading && imports.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-foreground/40" />
          </div>
        ) : imports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-semibold text-foreground">
              No import history yet
            </p>
            <p className="text-sm text-foreground/60 mt-2">
              Start importing recipes to see them here
            </p>
            <Button className="mt-4" onClick={() => router.push("/")}>
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <HistoryTable
            data={imports}
            sorting={sorting}
            onSortingChange={setSorting}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            actionHandlers={actionHandlers}
          />
        )}
      </div>
    </div>
  );
}
