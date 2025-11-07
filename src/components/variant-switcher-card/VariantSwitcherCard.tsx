"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  VariantSwitcherCardProps,
  RecipeVariantMeta,
} from "./VariantSwitcherCard.types";
import { sortVariants } from "./VariantSwitcherCard.utils";

export function VariantSwitcherCard({ recipe }: VariantSwitcherCardProps) {
  const [variants, setVariants] = useState<RecipeVariantMeta[]>([
    {
      id: recipe.id,
      title: recipe.recipe_data?.title || "Original",
      isOriginal: true,
    },
  ]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RecipeVariantMeta | null>(
    null
  );
  const [newName, setNewName] = useState("");

  const sorted = useMemo(() => sortVariants(variants), [variants]);

  const handleRename = (v: RecipeVariantMeta) => {
    if (v.isOriginal) return; // guard original
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
    if (v.isOriginal) return; // guard original
    setVariants((prev) => prev.filter((x) => x.id !== v.id));
  };

  return (
    <Card className={cn("rounded-2xl border border-border bg-card shadow-sm")}>
      <CardHeader className="pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
            Variants
          </p>
          <p className="text-sm text-muted-foreground">
            Switch between recipe versions
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {sorted.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2"
            >
              <span className={cn("text-sm", v.isOriginal && "font-medium")}>
                {v.title}
                {v.isOriginal && " (original)"}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => handleRename(v)}
                  disabled={v.isOriginal}
                  aria-label="Rename variant"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => handleDelete(v)}
                  disabled={v.isOriginal}
                  aria-label="Delete variant"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Rename variant</DialogTitle>
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              placeholder="Variant name"
            />
            <Button onClick={applyRename}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
