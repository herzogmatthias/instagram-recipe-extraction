"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bookmark,
  Share2,
  ExternalLink,
  Pencil,
  Trash2,
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

  const applyRename = () => {
    if (!renameTarget) return;
    setVariants((prev) =>
      prev.map((v) =>
        v.id === renameTarget.id
          ? { ...v, title: newName.trim() || v.title }
          : v
      )
    );
    setRenameOpen(false);
  };

  const handleDelete = (v: RecipeVariantMeta) => {
    if (v.isOriginal) return;
    setVariants((prev) => prev.filter((x) => x.id !== v.id));
    if (activeVariantId === v.id) {
      setActiveVariantId(sorted[0]?.id ?? recipe.id);
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
                        >
                          <Trash2 className="size-3" />
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
