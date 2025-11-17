import type { ReactNode } from "react";
import type {
  ShoppingListItem,
  ShoppingListItemUpdateInput,
} from "@/models/ShoppingListItem";

export type ShoppingListItemCardProps = {
  item: ShoppingListItem;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (
    id: string,
    updates: ShoppingListItemUpdateInput
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export type ShoppingFieldProps = {
  label: string;
  displayValue: ReactNode;
  children?: ReactNode;
};
