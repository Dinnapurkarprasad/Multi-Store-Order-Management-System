"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Item, Store } from "@/lib/types";

// One store per order — the API has no cross-store carts, so this is enforced
// in state rather than discovered at checkout (API.md gotcha 7).
//
// Persisted, so a reload mid-order doesn't lose the basket. The idempotency key
// persists with it, which is the point: the same cart keeps the same key even
// across a refresh, so a retried Place order can't create a second order.

export type CartLine = { item: Item; qty: number };

type CartState = {
  storeId: string | null;
  storeName: string | null;
  lines: CartLine[];
  /** Generated when the cart is created, not per click (PRD §6). */
  idempotencyKey: string | null;

  /** Only valid when the cart is empty or already on this store — the caller
   *  confirms the switch first, then calls startNew(). */
  add: (store: Pick<Store, "id" | "name">, item: Item) => void;
  setQty: (itemId: string, qty: number) => void;
  /** Clears whatever was there and begins a cart on a different store. */
  startNew: (store: Pick<Store, "id" | "name">, item: Item) => void;
  /** Drops lines whose items came back unavailable, after a 400 on checkout. */
  reconcile: (availableItemIds: string[]) => number;
  clear: () => void;
};

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : // Older Safari over http. The key only has to be unique per cart.
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      storeName: null,
      lines: [],
      idempotencyKey: null,

      add: (store, item) => {
        const { storeId, lines, idempotencyKey } = get();
        const existing = lines.find((line) => line.item.id === item.id);

        set({
          storeId: store.id,
          storeName: store.name,
          // A fresh cart gets a fresh key; an existing one keeps its own.
          idempotencyKey: storeId === store.id && idempotencyKey ? idempotencyKey : newKey(),
          lines: existing
            ? lines.map((line) =>
                line.item.id === item.id ? { ...line, qty: line.qty + 1 } : line,
              )
            : [...lines, { item, qty: 1 }],
        });
      },

      setQty: (itemId, qty) => {
        // qty 0 removes the line, which is what the stepper's minus does at 1.
        const lines = get()
          .lines.map((line) =>
            line.item.id === itemId ? { ...line, qty: Math.min(qty, 100) } : line,
          )
          .filter((line) => line.qty > 0);

        set(lines.length ? { lines } : { lines: [], storeId: null, storeName: null, idempotencyKey: null });
      },

      startNew: (store, item) =>
        set({
          storeId: store.id,
          storeName: store.name,
          lines: [{ item, qty: 1 }],
          idempotencyKey: newKey(),
        }),

      reconcile: (availableItemIds) => {
        const { lines } = get();
        const kept = lines.filter((line) => availableItemIds.includes(line.item.id));
        const dropped = lines.length - kept.length;

        if (dropped > 0) {
          set(
            kept.length
              ? { lines: kept }
              : { lines: [], storeId: null, storeName: null, idempotencyKey: null },
          );
        }
        return dropped;
      },

      clear: () =>
        set({ storeId: null, storeName: null, lines: [], idempotencyKey: null }),
    }),
    { name: "counter.cart" },
  ),
);

/** Display only. `total_amount` from the POST /orders response is the truth —
 *  the server computes it from database prices and ignores anything we send. */
export const cartSubtotal = (lines: CartLine[]) =>
  lines.reduce((sum, { item, qty }) => sum + item.price * qty, 0);

export const cartCount = (lines: CartLine[]) =>
  lines.reduce((sum, { qty }) => sum + qty, 0);
