"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShoppingListItemCard } from "@/components/shopping-list/ShoppingListItemCard";
import { useShoppingList } from "@/lib/client/hooks/useShoppingList";
import {
  deleteShoppingListItem,
  updateShoppingListItem,
} from "@/lib/client/services/shoppingList";
import type { ShoppingListItemUpdateInput } from "@/models/ShoppingListItem";

export default function ShoppingListPage() {
  const { items, loading, error } = useShoppingList();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUpdate = async (
    id: string,
    updates: ShoppingListItemUpdateInput
  ) => {
    setSavingId(id);
    try {
      await updateShoppingListItem(id, updates);
      toast.success("Shopping list updated.");
    } catch (err) {
      console.error("[shopping-list] update failed", err);
      toast.error("Unable to update that item.");
      throw err instanceof Error ? err : new Error("Failed to update item");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteShoppingListItem(id);
      toast.success("Item removed from shopping list.");
    } catch (err) {
      console.error("[shopping-list] delete failed", err);
      toast.error("Unable to remove that item.");
      throw err instanceof Error ? err : new Error("Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] px-6 py-28 md:px-14">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#333333] shadow-sm">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#D6E2C3] text-[#333333]">
              <ShoppingBag className="h-4 w-4" />
            </span>
            Shopping list
          </div>
          <div>
            <h1 className="text-3xl font-heading font-semibold text-[#333333]">
              Ingredients ready for market
            </h1>
            <p className="mt-2 max-w-2xl text-base text-[#333333]/65">
              Add ingredients from any recipe detail page using the “Shopping
              list” button. Come back here to keep everything organized, edit
              quantities, or remove items once you have them.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                asChild
                variant="secondary"
                className="rounded-full bg-[#D6E2C3] text-[#333333] hover:bg-[#C8D5B2]"
              >
                <Link href="/">Browse recipes</Link>
              </Button>
              <span className="text-sm text-[#333333]/60">
                {items.length} item{items.length === 1 ? "" : "s"} tracked
              </span>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-border/60 bg-white/80 p-8 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#333333]" />
              Loading shopping list...
            </div>
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <ShoppingListItemCard
                key={item.id}
                item={item}
                isSaving={savingId === item.id}
                isDeleting={deletingId === item.id}
                onSave={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border/70 bg-white/80 px-8 py-12 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#D6E2C3]/60 text-[#333333]">
        <ShoppingBag className="h-7 w-7" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-[#333333]">
        No items yet
      </h2>
      <p className="mt-2 text-base text-[#333333]/70">
        Use the “Shopping list” action on any recipe to collect the ingredients
        you need. They will appear here automatically.
      </p>
      <Button
        asChild
        className="mt-6 rounded-full bg-[#F3C6A5] text-[#333333] hover:bg-[#E9B48D]"
      >
        <Link href="/">View recipes</Link>
      </Button>
    </div>
  );
}
