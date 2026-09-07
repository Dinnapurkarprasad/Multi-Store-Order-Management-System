"use client";

// React Query hooks for the admin console. Calls live in lib/api/admin.ts,
// lib/api/public.ts (the unscoped store list) and lib/api/owner.ts (PATCH).

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { archiveOldOrders, listAllOrders } from "../api/admin";
import { updateStore } from "../api/owner";
import { listStores } from "../api/public";
import { getRevenuePerStore } from "../api/analytics";
import { keys } from "../queryKeys";
import { notify } from "../toast";
import type { ArchiveResult, Store } from "../types";

/** Every order on the platform. Wider limit than the shopper's — an admin is
 *  scanning, not reading. */
export function useAllOrders() {
  return useInfiniteQuery({
    queryKey: keys.orders({ scope: "all" }),
    queryFn: ({ pageParam }) => listAllOrders({ limit: 50, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.meta.hasMore ? (last.meta.nextCursor ?? undefined) : undefined,
  });
}

/**
 * Every store, including the hidden ones.
 *
 * There's a gap in the API here: `GET /stores` returns ACTIVE stores only, and
 * `/stores/mine` is empty for an admin — so once an admin hides a store, no
 * endpoint will list it again and it can never be switched back on.
 *
 * `revenue-per-store` is the way through: it's built off the orders views and
 * returns a row for every store, with zeros for stores that have no completed
 * orders. Ids there but missing from the active list are the hidden ones.
 *
 * ponytail: a stopgap for a missing endpoint, not a design. If the backend
 * grows `GET /stores?include_inactive=true`, delete the merge and use it.
 */
export function useAllStores() {
  const active = useQuery({
    queryKey: keys.stores({ scope: "platform" }),
    queryFn: () => listStores({ limit: 100 }),
  });

  // A wide window, because a store with no recent orders still has to appear.
  const everyStore = useQuery({
    queryKey: keys.analytics("revenue-per-store", { scope: "roster" }),
    queryFn: () => getRevenuePerStore({}),
  });

  const activeStores = active.data?.data ?? [];
  const activeIds = new Set(activeStores.map((store) => store.id));

  const hidden = (everyStore.data ?? [])
    .filter((row) => !activeIds.has(row.store_id))
    // Only the id and name are knowable from analytics — enough to identify it
    // and turn it back on.
    .map((row) => ({ id: row.store_id, name: row.store_name }));

  return {
    isPending: active.isPending || everyStore.isPending,
    isError: active.isError,
    refetch: () => {
      active.refetch();
      everyStore.refetch();
    },
    activeStores,
    hidden,
  };
}

/** Admins can PATCH any store — this takes the id per call rather than per
 *  hook, so it works inside a table row. */
export function useUpdateAnyStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof updateStore>[1]) =>
      updateStore(id, input),
    onSuccess: (store: Store) => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      notify.success(
        store.is_active ? `${store.name} is visible` : `${store.name} is hidden`,
      );
    },
    onError: (error) => notify.error(error),
  });
}

export function useArchiveOldOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveOldOrders,
    onSuccess: (result: ArchiveResult) => {
      // Archived orders leave the live table, so every order list is now stale.
      // Analytics is NOT — it reads views that union live and archived rows.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      notify.success(
        `Archived ${result.archived} ${result.archived === 1 ? "order" : "orders"} in ${result.batches} ${result.batches === 1 ? "batch" : "batches"}`,
        "Analytics totals are unchanged.",
      );
    },
    onError: (error) => notify.error(error),
  });
}
