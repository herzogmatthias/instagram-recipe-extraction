"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getClientFirestore } from "@/lib/client/services/firebase";
import { SHOPPING_LIST_COLLECTION } from "@/lib/client/services/shoppingList";
import type { ShoppingListItem } from "@/models/ShoppingListItem";

interface UseShoppingListResult {
  items: ShoppingListItem[];
  loading: boolean;
  error: Error | null;
}

export function useShoppingList(): UseShoppingListResult {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    async function startListener() {
      try {
        const db = await getClientFirestore();
        const listRef = collection(db, SHOPPING_LIST_COLLECTION);
        const listQuery = query(listRef, orderBy("addedAt", "desc"));

        unsubscribe = onSnapshot(
          listQuery,
          (snapshot) => {
            const docs = snapshot.docs.map(mapShoppingDoc);
            setItems(docs);
            setLoading(false);
            setError(null);
          },
          (err) => {
            setError(new Error(err.message));
            setLoading(false);
          }
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Unable to load shopping list")
        );
        setLoading(false);
      }
    }

    startListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { items, loading, error };
}

function mapShoppingDoc(
  snapshot: QueryDocumentSnapshot
): ShoppingListItem {
  const data = snapshot.data() as Record<string, unknown>;
  return {
    id: snapshot.id,
    item: typeof data.item === "string" ? data.item : "",
    quantity:
      typeof data.quantity === "string" ? data.quantity : data.quantity ?? null,
    source:
      typeof data.source === "string" ? data.source : data.source ?? null,
    recipeId:
      typeof data.recipeId === "string" ? data.recipeId : data.recipeId ?? null,
    addedAt: toIsoString(data.addedAt) ?? new Date().toISOString(),
  };
}

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (
    typeof value === "object" &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}
