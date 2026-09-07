"use client";

// React Query hooks for the owner console. Calls live in lib/api/owner.ts.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listItems } from "../api/public";
import {
  advanceOrder,
  createItem,
  createStore,
  hideItem,
  listMyStores,
  listStoreOrders,
  updateItem,
  updateStore,
} from "../api/owner";
import { ApiError } from "../api/client";
import { patchOrder, snapshotOrders } from "../orderCache";
import { keys } from "../queryKeys";
import { notify } from "../toast";
import type { Item, Order, OrderStatus, Store } from "../types";
import { useConsole } from "@/store/console";

/** A plain array, no meta. Empty means a fresh owner who hasn't opened a
 *  storefront yet — that's the onboarding case, not an error. */
export function useMyStores() {
  return useQuery({
    queryKey: keys.stores({ scope: "mine" }),
    queryFn: listMyStores,
  });
}

/**
 * The store the console is pointed at. Falls back to the first one, so a
 * persisted id that no longer exists doesn't leave the console blank.
 */
export function useSelectedStore() {
  const query = useMyStores();
  const storeId = useConsole((s) => s.storeId);
  const setStoreId = useConsole((s) => s.setStoreId);

  const stores = query.data ?? [];
  const store = stores.find((option) => option.id === storeId) ?? stores[0];

  return { ...query, stores, store, setStoreId };
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  const setStoreId = useConsole((s) => s.setStoreId);

  return useMutation({
    mutationFn: createStore,
    onSuccess: (store: Store) => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      // Point the console at what was just created.
      setStoreId(store.id);
      notify.success(`${store.name} is open`, "Add items so people can order.");
    },
    onError: (error) => notify.error(error),
  });
}

export function useUpdateStore(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof updateStore>[1]) => updateStore(id, input),
    onSuccess: (store: Store) => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.setQueryData(keys.store(store.id), store);
      notify.success("Store updated");
    },
    onError: (error) => notify.error(error),
  });
}

/**
 * Every order for one store, newest first.
 *
 * ponytail: one page of 100, grouped into columns client-side. The rail needs
 * all three statuses at once and a fixed-height column can't page sensibly, so
 * a busy store would stop showing older COMPLETED tickets. Give the Completed
 * column its own `?status=COMPLETED` query if that ever matters — PLACED and
 * PREPARING are the working set and stay far under the limit.
 */
export function useStoreOrders(storeId: string | undefined) {
  return useQuery({
    queryKey: keys.orders({ store_id: storeId }),
    queryFn: () => listStoreOrders({ store_id: storeId, limit: 100 }),
    enabled: Boolean(storeId),
  });
}

/**
 * Advance a ticket, optimistically.
 *
 * The rail is the one place latency shows — an owner tapping through a queue
 * shouldn't wait for a round trip per ticket. So patch every cached orders
 * query, keep a snapshot, and put it back if the server disagrees.
 */
export function useAdvanceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      advanceOrder(id, status),

    onMutate: async ({ id, status }) => {
      // Stop an in-flight refetch from landing on top of the patch.
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      const restore = snapshotOrders(queryClient);
      patchOrder(queryClient, id, { status, updated_at: new Date().toISOString() });
      return { restore };
    },

    onError: (error, _variables, context) => {
      context?.restore();

      // 409 means a colleague already moved it — the server is right, we're
      // stale. Refetch instead of showing a failure.
      if (error instanceof ApiError && error.code === "INVALID_STATUS_TRANSITION") {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        notify.message("That order already moved on.", "Refreshed from the server.");
        return;
      }
      notify.error(error);
    },

    // The socket broadcasts this too, but a rail must be right with sockets
    // off — so reconcile against the server either way.
    onSuccess: (order: Order) => patchOrder(queryClient, order.id, order),
  });
}

// ── Menu ──────────────────────────────────────────────────────────────────

/** No `available` filter — an owner has to see hidden items to re-enable them. */
export function useMenu(storeId: string | undefined) {
  return useQuery({
    queryKey: keys.items(storeId ?? ""),
    queryFn: () => listItems(storeId!),
    enabled: Boolean(storeId),
  });
}

export function useCreateItem(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; price: number; image_url?: string }) =>
      createItem(storeId, input),
    onSuccess: (item: Item) => {
      queryClient.invalidateQueries({ queryKey: keys.items(storeId) });
      // The public store page shows items too.
      queryClient.invalidateQueries({ queryKey: keys.store(storeId) });
      notify.success(`${item.name} added`);
    },
    onError: (error) => notify.error(error),
  });
}

export function useUpdateItem(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & Parameters<typeof updateItem>[1]) => updateItem(id, input),
    onSuccess: (item: Item) => {
      queryClient.invalidateQueries({ queryKey: keys.items(storeId) });
      queryClient.invalidateQueries({ queryKey: keys.store(storeId) });
      notify.success(`${item.name} updated`);
    },
    onError: (error) => notify.error(error),
  });
}

/** Soft delete — returns the updated item, so the row is patched, not removed. */
export function useHideItem(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => hideItem(id),
    onSuccess: (item: Item) => {
      queryClient.setQueryData<Item[]>(keys.items(storeId), (items) =>
        items?.map((existing) => (existing.id === item.id ? item : existing)),
      );
      queryClient.invalidateQueries({ queryKey: keys.store(storeId) });
      notify.success(`${item.name} hidden`, "Shoppers can no longer order it.");
    },
    onError: (error) => notify.error(error),
  });
}
