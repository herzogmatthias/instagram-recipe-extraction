"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ShoppingFieldProps,
  ShoppingListItemCardProps,
} from "./ShoppingListItemCard.types";
import {
  formatAddedDate,
  getDisplayValue,
} from "./ShoppingListItemCard.utils";

export function ShoppingListItemCard({
  item,
  isSaving,
  isDeleting,
  onSave,
  onDelete,
}: ShoppingListItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    item: item.item,
    quantity: item.quantity ?? "",
    source: item.source ?? "",
  });

  useEffect(() => {
    if (!isEditing) {
      setFormValues({
        item: item.item,
        quantity: item.quantity ?? "",
        source: item.source ?? "",
      });
    }
  }, [item, isEditing]);

  const handleInputChange = (
    field: keyof typeof formValues,
    value: string
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const startEdit = () => setIsEditing(true);

  const cancelEdit = () => {
    setIsEditing(false);
    setFormValues({
      item: item.item,
      quantity: item.quantity ?? "",
      source: item.source ?? "",
    });
  };

  const handleSave = async () => {
    await onSave(item.id, {
      item: formValues.item,
      quantity: formValues.quantity || null,
      source: formValues.source || null,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    await onDelete(item.id);
  };

  const isValid = formValues.item.trim().length > 0;
  const displayQuantity = getDisplayValue(item.quantity);
  const displayItem = getDisplayValue(item.item);
  const displaySource = getDisplayValue(item.source);
  const addedAt = formatAddedDate(item.addedAt);

  return (
    <Card className="rounded-3xl border border-border/70 bg-white/90 p-4 shadow-sm">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,140px)_minmax(0,0.75fr)_minmax(0,1fr)]">
          <ShoppingField label="Quantity" displayValue={displayQuantity}>
            {isEditing && (
              <Input
                aria-label="Quantity"
                value={formValues.quantity}
                placeholder="e.g. 2 cups"
                onChange={(event) =>
                  handleInputChange("quantity", event.target.value)
                }
                disabled={isSaving}
              />
            )}
          </ShoppingField>

          <ShoppingField label="Item" displayValue={displayItem}>
            {isEditing && (
              <Input
                aria-label="Item"
                value={formValues.item}
                placeholder="Ingredient name"
                onChange={(event) =>
                  handleInputChange("item", event.target.value)
                }
                disabled={isSaving}
              />
            )}
          </ShoppingField>

          <ShoppingField label="Source" displayValue={displaySource}>
            {isEditing && (
              <Input
                aria-label="Source"
                value={formValues.source}
                placeholder="Recipe or creator"
                onChange={(event) =>
                  handleInputChange("source", event.target.value)
                }
                disabled={isSaving}
              />
            )}
          </ShoppingField>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Added {addedAt}
          </p>

          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  className="gap-1 rounded-full bg-[#D6E2C3] text-[#333333] hover:bg-[#C8D5B2]"
                  onClick={handleSave}
                  disabled={!isValid || isSaving}
                >
                  <Check className="h-4 w-4" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 rounded-full border-[#EAEAEA]"
                  onClick={cancelEdit}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 rounded-full border-[#EAEAEA]"
                  onClick={startEdit}
                  disabled={isSaving || isDeleting}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 rounded-full text-red-600 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ShoppingField({
  label,
  displayValue,
  children,
}: ShoppingFieldProps) {
  const hasChildContent =
    children !== undefined && children !== null && children !== false;
  const content = hasChildContent ? (
    children
  ) : (
    <div className="min-h-[38px] rounded-2xl border border-border/70 bg-[#FDFDFB] px-3 py-2 text-sm font-medium text-[#333333]">
      {displayValue}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
        {label}
      </span>
      {content}
    </div>
  );
}
