import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getClientFirestore } from "./firebase";
import type {
  ShoppingListItemInput,
  ShoppingListItemUpdateInput,
} from "@/models/ShoppingListItem";

export const SHOPPING_LIST_COLLECTION = "shoppingListItems";

function normalizeValue(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function addShoppingListItems(
  items: ShoppingListItemInput[]
): Promise<void> {
  if (items.length === 0) return;

  const db = await getClientFirestore();
  const collectionRef = collection(db, SHOPPING_LIST_COLLECTION);
  const batch = writeBatch(db);

  items.forEach((item) => {
    const docRef = doc(collectionRef);
    batch.set(docRef, {
      item: item.item.trim(),
      quantity: normalizeValue(item.quantity),
      source: normalizeValue(item.source),
      recipeId: normalizeValue(item.recipeId ?? undefined),
      addedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function updateShoppingListItem(
  id: string,
  updates: ShoppingListItemUpdateInput
): Promise<void> {
  const db = await getClientFirestore();
  const docRef = doc(db, SHOPPING_LIST_COLLECTION, id);

  const payload: Record<string, string | null> = {};
  if (typeof updates.item === "string") {
    payload.item = updates.item.trim();
  }
  if ("quantity" in updates) {
    payload.quantity = normalizeValue(updates.quantity);
  }
  if ("source" in updates) {
    payload.source = normalizeValue(updates.source);
  }

  await updateDoc(docRef, payload);
}

export async function deleteShoppingListItem(id: string): Promise<void> {
  const db = await getClientFirestore();
  const docRef = doc(db, SHOPPING_LIST_COLLECTION, id);
  await deleteDoc(docRef);
}
