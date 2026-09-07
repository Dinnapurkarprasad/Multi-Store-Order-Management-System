// No auth required. The shopper's browse and store pages run on these, and an
// admin uses the same unscoped list to see every store — /stores/mine is empty
// for an admin.
import { http, httpPage } from "./client";
import type { Item, Store, StoreWithItems } from "../types";

/** Active stores only — an inactive store never appears here. Cursor paginated. */
export const listStores = (params: {
  q?: string;
  limit?: number;
  cursor?: string;
}) => httpPage<Store>({ method: "get", url: "/stores", params });

/**
 * Store detail WITH its available items in one request. Don't follow this with
 * a call for items — `items` is already here, filtered to is_available and
 * sorted by name, and it's [] rather than null when empty.
 */
export const getStore = (id: string) =>
  http<StoreWithItems>({ method: "get", url: `/stores/${id}` });

/**
 * Items for a store, not paginated.
 *
 * `available` omitted returns ALL items including hidden ones — that's what an
 * owner's menu screen needs so a soft-deleted item can be re-enabled. A
 * customer-facing list passes true.
 */
export const listItems = (storeId: string, available?: boolean) =>
  http<Item[]>({
    method: "get",
    url: `/stores/${storeId}/items`,
    params: available === undefined ? undefined : { available },
  });
