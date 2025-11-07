"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "./Navbar";
import { useProcessingQueue } from "@/lib/client/hooks/useProcessingQueue";
import { toast } from "sonner";
import type { RecipeImportDocument } from "@/models/RecipeImport";

export function NavbarWrapper() {
  const router = useRouter();
  const pathname = usePathname();
  const [isProcessingPopoverOpen, setProcessingPopoverOpen] = useState(false);
  const { queue: processingQueue, removeFromQueue, addToQueue } =
    useProcessingQueue();

  const handleAddRecipe = useCallback(() => {
    // Navigate to home page if not already there
    if (pathname !== "/") {
      router.push("/");
    }
    // Dispatch custom event to open add modal on home page
    window.dispatchEvent(new CustomEvent("openAddRecipeModal"));
  }, [pathname, router]);

  const handleOpenFilters = useCallback(() => {
    // Dispatch custom event to open filters dialog on home page
    window.dispatchEvent(new CustomEvent("openFiltersDialog"));
  }, []);

  const handleViewHistory = useCallback(() => {
    router.push("/history");
    setProcessingPopoverOpen(false);
  }, [router]);

  const handleRemoveFromQueue = useCallback(
    async (id: string) => {
      const item = processingQueue.find((queueItem) => queueItem.id === id);
      const isTerminal =
        item && (item.status === "ready" || item.status === "failed");

      try {
        if (!isTerminal) {
          const response = await fetch(`/api/recipes/import/${id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to cancel import");
          }
        }

        removeFromQueue(id);
        toast.success(isTerminal ? "Removed from queue" : "Import cancelled");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to cancel import";
        toast.error(message);
        if (isTerminal) {
          removeFromQueue(id);
        }
      }
    },
    [processingQueue, removeFromQueue]
  );

  const handleRetryFromQueue = useCallback(
    async (id: string) => {
      const item = processingQueue.find((item) => item.id === id);
      if (!item) return;

      try {
        const response = await fetch("/api/recipes/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: item.url }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to retry import");
        }

        const newImportDoc =
          (await response.json()) as RecipeImportDocument;

        removeFromQueue(id);
        addToQueue(newImportDoc);
        toast.success("Import restarted");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to retry import";
        toast.error(message);
      }
    },
    [processingQueue, removeFromQueue, addToQueue]
  );

  // Only show Add Recipe button and Filters on home page
  const showAddRecipe = pathname === "/";
  const showFilters = pathname === "/";

  return (
    <Navbar
      onAddRecipe={showAddRecipe ? handleAddRecipe : undefined}
      onOpenFilters={showFilters ? handleOpenFilters : undefined}
      onViewHistory={handleViewHistory}
      activeFilterCount={0}
      processingItems={processingQueue}
      processingOpen={isProcessingPopoverOpen}
      onProcessingOpenChange={setProcessingPopoverOpen}
      onRemoveFromQueue={handleRemoveFromQueue}
      onRetryFromQueue={handleRetryFromQueue}
    />
  );
}
