export interface ShoppingListItem {
  id: string;
  item: string;
  quantity?: string | null;
  source?: string | null;
  recipeId?: string | null;
  addedAt: string;
}

export interface ShoppingListItemInput {
  item: string;
  quantity?: string | null;
  source?: string | null;
  recipeId?: string | null;
}

export type ShoppingListItemUpdateInput = Partial<
  Pick<ShoppingListItem, "item" | "quantity" | "source">
>;
