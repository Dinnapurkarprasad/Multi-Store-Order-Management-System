// Role: STORE_OWNER (ADMIN may call most of these too). Running a storefront.
import { http, httpPage } from "./client";
import type { Item, Order, OrderStatus, Store } from "../types";

/**
 * A plain array, newest first — no `meta`, not paginated. Includes inactive
 * stores, unlike the public list.
 *
 * Owners can have SEVERAL stores, so the console needs a switcher. An empty
 * array is the fresh-signup case and should become the onboarding screen.
 * For an admin this returns only stores they personally own — usually [].
 */
export const listMyStores = () =>
  http<Store[]>({ method: "get", url: "/stores/mine" });

/** `owner_id` comes from the token — there's no way to create a store for
 *  someone else. */
export const createStore = (input: {
  name: string;
  description?: string;
  image_url?: string;
}) => http<Store>({ method: "post", url: "/stores", data: input });

/**
 * At least one field required. `description` and `image_url` accept null to
 * clear them; omitting a key leaves it unchanged.
 *
 * `is_active: false` hides the store from the public list — label it in plain
 * language ("Visible to shoppers"), never as "is_active".
 */
export const updateStore = (
  id: string,
  input: {
    name?: string;
    description?: string | null;
    image_url?: string | null;
    is_active?: boolean;
  },
) => http<Store>({ method: "patch", url: `/stores/${id}`, data: input });

/** `price` must be a JSON number — "349" is a 400. Run form input through
 *  Number() before calling this. */
export const createItem = (
  storeId: string,
  input: { name: string; price: number; image_url?: string },
) => http<Item>({ method: "post", url: `/stores/${storeId}/items`, data: input });

/** Ownership resolves from the item's own store_id, so an item can't be moved
 *  between stores. `image_url: null` removes the picture. */
export const updateItem = (
  id: string,
  input: {
    name?: string;
    price?: number;
    image_url?: string | null;
    is_available?: boolean;
  },
) => http<Item>({ method: "patch", url: `/items/${id}`, data: input });

/**
 * SOFT delete — sets is_available = false and returns 200 with the updated
 * item, not a 204. The row is never removed, because hard deletion would break
 * order history. So patch the row in place; don't drop it from the table.
 *
 * Re-enable with updateItem(id, { is_available: true }).
 */
export const hideItem = (id: string) =>
  http<Item>({ method: "delete", url: `/items/${id}` });

/**
 * The incoming queue, auto-scoped to stores this owner owns. Passing a
 * store_id they don't own is a 403, not an empty list.
 */
export const listStoreOrders = (params: {
  store_id?: string;
  status?: OrderStatus;
  limit?: number;
  cursor?: string;
}) => httpPage<Order>({ method: "get", url: "/orders", params });

/**
 * Legal transitions are only PLACED → PREPARING → COMPLETED. Skipping a step,
 * going backwards, or touching a COMPLETED order is a 409.
 *
 * Derive the button from the current status rather than hardcoding it. A 409
 * can still happen when a colleague clicked first — refetch and re-render
 * rather than showing an error.
 */
export const advanceOrder = (id: string, status: OrderStatus) =>
  http<Order>({ method: "patch", url: `/orders/${id}/status`, data: { status } });
