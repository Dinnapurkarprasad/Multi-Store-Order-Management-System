// Role: USER. Placing orders and following them.
//
// GET /orders is scoped server-side by role, so a shopper calling it gets only
// their own orders — `store_id` is an extra filter here, not the scope.
import { http, httpPage } from "./client";
import type { Order, OrderStatus } from "../types";

/**
 * One store per order — there are no cross-store carts, and the cart state has
 * to enforce it or checkout fails.
 *
 * Never send `total_amount`: it's computed from database prices and anything
 * you send is ignored. Read it back off the response as the truth.
 *
 * `idempotencyKey` should be a UUID generated when the cart is created, not
 * per click — that's what makes a double-tapped Place order button safe. A
 * replay returns 200 with the same order instead of creating a second one.
 *
 * A 400 here means some item is gone or unavailable, but the error is combined
 * so you cannot tell WHICH — refetch the store and reconcile the cart.
 */
export const placeOrder = (
  input: { store_id: string; items: { item_id: string; qty: number }[] },
  idempotencyKey: string,
) =>
  http<Order>({
    method: "post",
    url: "/orders",
    data: input,
    headers: { "Idempotency-Key": idempotencyKey },
  });

/**
 * The shopper's own orders, newest first, cursor paginated.
 *
 * Archived orders leave the live table, so this only ever returns recent
 * orders — the copy should say "Recent orders", not "all your orders".
 */
export const listMyOrders = (params: {
  status?: OrderStatus;
  limit?: number;
  cursor?: string;
}) => httpPage<Order>({ method: "get", url: "/orders", params });

/** A 404 here means "not found" — possibly because it isn't yours. The API
 *  returns 404 rather than 403 so order ids can't be probed, so never render
 *  this as "access denied". */
export const getOrder = (id: string) =>
  http<Order>({ method: "get", url: `/orders/${id}` });
