"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import {
  Bookmark,
  Share2,
  ExternalLink,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { fetchDedupe } from "@/lib/shared/utils/fetchDedupe";
import { toast } from "sonner";
import type {
  RecipeDetailHeaderProps,
  RecipeVariantMeta,
} from "./RecipeDetailHeader.types";
import { sortVariants } from "./RecipeDetailHeader.utils";

export function RecipeDetailHeader({
  recipe,
  className,
}: RecipeDetailHeaderProps) {
  const [variants, setVariants] = useState<RecipeVariantMeta[]>([
    {
      id: recipe.id,
      title: recipe.recipe_data?.title || "Original",
      isOriginal: true,
    },
  ]);
  const [activeVariantId, setActiveVariantId] = useState(recipe.id);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RecipeVariantMeta | null>(
    null
  );
  const [newName, setNewName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load variants from API on mount
  useEffect(() => {
    const loadVariants = async () => {
      try {
        const response = await fetchDedupe(
          `/api/recipes/${recipe.id}/variants`
        );
        if (!response.ok) return;

        const data = await response.json();
        const variantList: RecipeVariantMeta[] = data.variants.map(
          (v: { id: string; name: string }) => ({
            id: v.id,
            title: v.name,
            isOriginal: false,
          })
        );

        setVariants([
          {
            id: recipe.id,
            title: recipe.recipe_data?.title || "Original",
            isOriginal: true,
          },
          ...variantList,
        ]);
      } catch (error) {
        console.error("Failed to load variants:", error);
      }
    };

    loadVariants();
  }, [recipe.id, recipe.recipe_data?.title]);

  // Listen for new variants created by chatbot
  useEffect(() => {
    const handleVariantCreated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        variantId: string;
        variant: { id: string; name: string };
      }>;

      const { variantId, variant } = customEvent.detail;

      setVariants((prev) => {
        // Check if variant already exists
        if (prev.some((v) => v.id === variantId)) {
          return prev;
        }

        return [
          ...prev,
          {
            id: variantId,
            title: variant.name,
            isOriginal: false,
          },
        ];
      });
    };

    window.addEventListener("variantCreated", handleVariantCreated);
    return () => {
      window.removeEventListener("variantCreated", handleVariantCreated);
    };
  }, []);

  // Notify when variant selection changes
  useEffect(() => {
    const activeVar = variants.find((v) => v.id === activeVariantId);
    if (!activeVar) return;

    window.dispatchEvent(
      new CustomEvent("variantChanged", {
        detail: {
          variantId: activeVar.id,
          isOriginal: activeVar.isOriginal,
        },
      })
    );
  }, [activeVariantId, variants]);

  const sorted = useMemo(() => sortVariants(variants), [variants]);
  const activeVariant =
    sorted.find((v: RecipeVariantMeta) => v.id === activeVariantId) ??
    sorted[0];

  const handleRename = (v: RecipeVariantMeta) => {
    if (v.isOriginal) return;
    setRenameTarget(v);
    setNewName(v.title);
    setRenameOpen(true);
  };

  const applyRename = async () => {
    if (!renameTarget) return;
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    try {
      const response = await fetch(
        `/api/recipes/${recipe.id}/variants/${renameTarget.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to rename variant");
      }

      setVariants((prev) =>
        prev.map((v) =>
          v.id === renameTarget.id ? { ...v, title: trimmedName } : v
        )
      );
      setRenameOpen(false);
    } catch (error) {
      console.error("Failed to rename variant:", error);
    }
  };

  const handleDelete = async (v: RecipeVariantMeta) => {
    if (v.isOriginal) return;

    setDeletingId(v.id);
    try {
      const response = await fetch(
        `/api/recipes/${recipe.id}/variants/${v.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete variant");
      }

      // Remove variant from list
      setVariants((prev) => prev.filter((x) => x.id !== v.id));

      // If we're deleting the currently active variant, switch to original
      if (activeVariantId === v.id) {
        const originalVariant = sorted.find((x) => x.isOriginal);
        if (originalVariant) {
          setActiveVariantId(originalVariant.id);

          // Dispatch event to notify chatbot to switch to original thread
          window.dispatchEvent(
            new CustomEvent("variantChanged", {
              detail: {
                variantId: originalVariant.id,
                isOriginal: true,
              },
            })
          );
        }
      }

      toast.success("Variant deleted");
    } catch (error) {
      console.error("Failed to delete variant:", error);
      toast.error("Failed to delete variant");
    } finally {
      setDeletingId(null);
    }
  };

  const authorHandle = `@${recipe.ownerUsername}`;
  const title =
    activeVariant?.title ||
    recipe.recipe_data?.title ||
    recipe.caption ||
    "Recipe";
  const postUrl = recipe.url || recipe.inputUrl;

  return (
    <header
      className={cn(
        "rounded-3xl border border-border bg-card px-6 py-5 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">
            {recipe.ownerFullName ? (
              <>
                <span className="font-medium text-foreground">
                  {recipe.ownerFullName}
                </span>{" "}
                <span className="text-muted-foreground/80">{authorHandle}</span>
              </>
            ) : (
              <span className="font-medium text-foreground">
                {authorHandle}
              </span>
            )}
          </p>
          <h1 className="mt-1 text-3xl font-heading font-bold leading-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Version:</span>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs font-medium hover:bg-muted"
                >
                  <span>
                    {activeVariant?.isOriginal
                      ? "Original"
                      : activeVariant?.title}
                  </span>
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {sorted.map((v: RecipeVariantMeta) => (
                  <DropdownMenuItem
                    key={v.id}
                    onClick={() => setActiveVariantId(v.id)}
                    className="flex items-center justify-between"
                  >
                    <span className={cn(v.isOriginal && "font-medium")}>
                      {v.title}
                      {v.isOriginal && " (original)"}
                    </span>
                    {!v.isOriginal && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(v);
                          }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(v);
                          }}
                          disabled={deletingId === v.id}
                        >
                          {deletingId === v.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                        </Button>
                      </div>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label="Save recipe (coming soon)"
            disabled
          >
            <Bookmark className="size-4" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Share recipe (coming soon)"
            disabled
          >
            <Share2 className="size-4" />
            Share
          </Button>
          <Button asChild size="sm">
            <Link href={postUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Open IG
            </Link>
          </Button>
        </div>
      </div>

      {recipe.productType && (
        <div className="mt-4">
          <Badge variant="outline" className="uppercase tracking-wide">
            {recipe.productType}
          </Badge>
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Rename variant</DialogTitle>
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              placeholder="Variant name"
              onKeyDown={(e) => {
                if (e.key === "Enter") applyRename();
              }}
            />
            <Button onClick={applyRename}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
