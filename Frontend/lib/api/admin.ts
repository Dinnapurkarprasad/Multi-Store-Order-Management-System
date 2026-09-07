// Role: ADMIN. Platform-wide views and the one maintenance action.
//
// Admin screens build on the UNSCOPED endpoints: use listStores() from
// ./public for every store, and listAllOrders() here for every order.
// /stores/mine is empty for an admin, and an admin cannot place orders.
import { httpPage, http } from "./client";
import type { ArchiveResult, Order, OrderStatus } from "../types";

/** Every order on the platform, newest first. */
export const listAllOrders = (params: {
  store_id?: string;
  status?: OrderStatus;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}) => httpPage<Order>({ method: "get", url: "/orders", params });

/**
 * Moves orders older than `days` — with their line items — into the archive
 * tables, in batches, one transaction per batch. Safe to call twice: a second
 * run returns archived: 0.
 *
 * Archived orders DISAPPEAR from GET /orders but stay in every analytics
 * number. Seeded data spans 90 days, so running this with days: 30 during
 * development empties roughly two thirds of the order screens — demo it last.
 */
export const archiveOldOrders = (input?: { days?: number; batchSize?: number }) =>
  http<ArchiveResult>({
    method: "post",
    url: "/archive-old-orders",
    data: input ?? {},
  });
