import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Order, Page } from "./types";

// Orders sit in the cache in two shapes: a plain page (the owner rail) and
// InfiniteData (the shopper's list). Both the optimistic advance and the socket
// events have to patch whichever is mounted, so the shape handling lives here
// once instead of in each caller.
type OrdersCache = Page<Order> | InfiniteData<Page<Order>> | undefined;

const isInfinite = (
  value: NonNullable<OrdersCache>,
): value is InfiniteData<Page<Order>> => "pages" in value;

/** Every cached orders query, whatever its params. */
const ORDERS = { queryKey: ["orders"] as const };

function mapPages(
  cache: OrdersCache,
  mapPage: (page: Page<Order>) => Page<Order>,
): OrdersCache {
  if (!cache) return cache;
  if (isInfinite(cache)) {
    return { ...cache, pages: cache.pages.map(mapPage) };
  }
  return mapPage(cache);
}

/**
 * Merge fields into one order wherever it's cached.
 *
 * Used by the socket's order:status_updated, whose payload is SLIM — no
 * `items`. So this merges rather than replaces; overwriting the object would
 * blank the line items on the shopper's card.
 */
export function patchOrder(
  queryClient: QueryClient,
  id: string,
  patch: Partial<Order>,
) {
  queryClient.setQueriesData<OrdersCache>(ORDERS, (cache) =>
    mapPages(cache, (page) => ({
      ...page,
      data: page.data.map((order) =>
        order.id === id ? { ...order, ...patch } : order,
      ),
    })),
  );

  // The single-order cache, if a detail view is open.
  queryClient.setQueryData<Order>(["order", id], (order) =>
    order ? { ...order, ...patch } : order,
  );
}

/**
 * Put a new order at the top of page 0 of every cached list.
 *
 * Guards against duplicates: the shopper who placed the order gets the
 * mutation response AND the socket event for the same order.
 */
export function prependOrder(queryClient: QueryClient, order: Order) {
  queryClient.setQueriesData<OrdersCache>(ORDERS, (cache) => {
    if (!cache) return cache;

    const exists = (page: Page<Order>) =>
      page.data.some((existing) => existing.id === order.id);

    if (isInfinite(cache)) {
      if (cache.pages.some(exists)) return cache;
      const [first, ...rest] = cache.pages;
      return first
        ? { ...cache, pages: [{ ...first, data: [order, ...first.data] }, ...rest] }
        : cache;
    }

    return exists(cache) ? cache : { ...cache, data: [order, ...cache.data] };
  });
}

/** Snapshot for rollback — returns a restore function. */
export function snapshotOrders(queryClient: QueryClient) {
  const entries = queryClient.getQueriesData<OrdersCache>(ORDERS);
  return () => {
    for (const [key, value] of entries) {
      queryClient.setQueryData(key, value);
    }
  };
}
