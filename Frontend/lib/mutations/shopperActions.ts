"use client";

// React Query hooks for the shopper screens. The calls themselves live in
// lib/api/public.ts and lib/api/shopper.ts.

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getStore, listStores } from "../api/public";
import { listMyOrders, placeOrder } from "../api/shopper";
import { money } from "../money";
import { keys } from "../queryKeys";
import { notify } from "../toast";
import type { Order } from "../types";

const PAGE = 20;

export function useStores(q: string) {
  return useInfiniteQuery({
    queryKey: keys.stores({ q }),
    queryFn: ({ pageParam }) =>
      listStores({ q: q || undefined, limit: PAGE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    // No page numbers — keyset cursors only, so this is Load more / infinite
    // scroll and never a numbered pager.
    getNextPageParam: (last) =>
      last.meta.hasMore ? (last.meta.nextCursor ?? undefined) : undefined,
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: keys.store(id),
    // Items come with the store, already filtered to available — one call.
    queryFn: () => getStore(id),
  });
}

/**
 * The shopper's orders, unfiltered, newest first.
 *
 * ponytail: one unfiltered stream, tabs filter it client-side. The API takes a
 * single `status`, but the Active tab needs PLACED **and** PREPARING — two
 * queries would double the requests and interleave two cursors. Switching tabs
 * is instant this way. If an account ever holds thousands of orders, give
 * Completed its own `?status=COMPLETED` query.
 */
export function useMyOrders() {
  return useInfiniteQuery({
    queryKey: keys.orders({ scope: "mine" }),
    queryFn: ({ pageParam }) => listMyOrders({ limit: PAGE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.meta.hasMore ? (last.meta.nextCursor ?? undefined) : undefined,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      storeId,
      items,
      idempotencyKey,
    }: {
      storeId: string;
      items: { item_id: string; qty: number }[];
      idempotencyKey: string;
    }) => placeOrder({ store_id: storeId, items }, idempotencyKey),

    onSuccess: (order: Order) => {
      // Refetch-after-mutation is the mechanism; the socket in goal 5 is only
      // a speed-up layered on top.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      notify.success(`Order placed · ${money(order.total_amount)}`, order.store_name);
    },
    // The 400 case needs the store refetched and the cart reconciled, which
    // the store page owns — it passes its own onError.
  });
}
