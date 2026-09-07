"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getOrdersPerDay,
  getRevenuePerStore,
  getSummary,
  getTopItems,
} from "../api/analytics";
import { keys } from "../queryKeys";

export type RangeDays = 7 | 30 | 90;

/**
 * `to` is left off — the API defaults it to now. `from` is a plain date string;
 * a range over 366 days is a 400, so 90 is the safe ceiling here.
 *
 * new Date() is fine for BUILDING a query param. The rule it must not break is
 * reformatting the `day` values that come BACK, which are bare YYYY-MM-DD with
 * no zone.
 */
export const rangeParams = (days: RangeDays) => ({
  from: new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10),
});

/** store_id omitted → every store, for an admin. */
export function useSummary(days: RangeDays, storeId?: string) {
  const params = { ...rangeParams(days), store_id: storeId };
  return useQuery({
    queryKey: keys.analytics("summary", params),
    queryFn: () => getSummary(params),
  });
}

export function useOrdersPerDay(days: RangeDays, storeId?: string) {
  const params = { ...rangeParams(days), store_id: storeId };
  return useQuery({
    queryKey: keys.analytics("orders-per-day", params),
    queryFn: () => getOrdersPerDay(params),
  });
}

export function useTopItems(days: RangeDays, storeId?: string, limit = 8) {
  const params = { ...rangeParams(days), store_id: storeId, limit };
  return useQuery({
    queryKey: keys.analytics("top-items", params),
    queryFn: () => getTopItems(params),
  });
}

export function useRevenuePerStore(days: RangeDays) {
  const params = rangeParams(days);
  return useQuery({
    queryKey: keys.analytics("revenue-per-store", params),
    queryFn: () => getRevenuePerStore(params),
  });
}
