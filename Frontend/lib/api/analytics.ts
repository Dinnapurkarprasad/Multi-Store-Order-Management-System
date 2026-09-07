// Roles: STORE_OWNER and ADMIN. A USER gets 403 on all four.
//
// Scoping happens server-side: an admin sees every store, an owner only their
// own, and an owner passing a store_id they don't own gets a 403. So the same
// four functions serve both consoles.
//
// Guards: `from` after `to` is a 400, and a range longer than 366 days is a 400.
import { http } from "./client";
import type {
  AnalyticsSummary,
  OrdersPerDay,
  RevenuePerStore,
  TopItem,
} from "../types";

/** from defaults to 30 days ago, to defaults to now. */
export type Range = { from?: string; to?: string; store_id?: string };

export const getSummary = (params: Range = {}) =>
  http<AnalyticsSummary>({ method: "get", url: "/analytics/summary", params });

/** Gap-filled — every day in the range is present, with zeros where there were
 *  no orders, so the chart has no holes. */
export const getOrdersPerDay = (params: Range = {}) =>
  http<OrdersPerDay[]>({
    method: "get",
    url: "/analytics/orders-per-day",
    params,
  });

/** Sorted by revenue. COMPLETED orders only, so this will NOT match
 *  summary.total_revenue — that's intended, not a bug to reconcile in the UI. */
export const getRevenuePerStore = (params: Range = {}) =>
  http<RevenuePerStore[]>({
    method: "get",
    url: "/analytics/revenue-per-store",
    params,
  });

/** Sorted by units_sold, not revenue — so the top seller by volume can earn
 *  less than the item below it. Bar length and revenue won't always agree. */
export const getTopItems = (params: Range & { limit?: number } = {}) =>
  http<TopItem[]>({ method: "get", url: "/analytics/top-items", params });
