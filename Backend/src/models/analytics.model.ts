import { query } from "../db/pool.js";

/**
 * Every query reads the `orders_all` / `order_items_all` views, which UNION ALL the live and
 * archived tables — otherwise revenue would drop every time the archival job runs.
 * `storeIds = null` means "no restriction"; an empty array correctly matches nothing.
 */
export interface Range {
  from: Date;
  to: Date;
  storeIds: string[] | null;
}

export const ordersPerDay = async ({ from, to, storeIds }: Range) =>
  (
    await query<{ day: string; orders: number; revenue: number }>(
      // generate_series gap-fills, so a day with no orders still returns a 0 row.
      // day is returned as 'YYYY-MM-DD' text: a bare `date` gets parsed into a local-midnight
      // Date and serialises shifted by the server's UTC offset, moving points to the wrong day.
      `SELECT to_char(d, 'YYYY-MM-DD') AS day,
              COUNT(o.id)                      AS orders,
              COALESCE(SUM(o.total_amount), 0) AS revenue
       FROM generate_series($1::date, $2::date, '1 day') d
       LEFT JOIN orders_all o
         ON o.created_at >= d
        AND o.created_at < d + INTERVAL '1 day'
        AND ($3::uuid[] IS NULL OR o.store_id = ANY($3))
       GROUP BY d
       ORDER BY d`,
      [from, to, storeIds],
    )
  ).rows;

export const revenuePerStore = async ({ from, to, storeIds }: Range) =>
  (
    await query<{ store_id: string; store_name: string; order_count: number; revenue: number }>(
      // LEFT JOIN so a store with zero completed orders still appears, with revenue 0
      `SELECT s.id AS store_id, s.name AS store_name,
              COUNT(o.id)                      AS order_count,
              COALESCE(SUM(o.total_amount), 0) AS revenue
       FROM stores s
       LEFT JOIN orders_all o
         ON o.store_id = s.id
        AND o.status = 'COMPLETED'
        AND o.created_at BETWEEN $1 AND $2
       WHERE ($3::uuid[] IS NULL OR s.id = ANY($3))
       GROUP BY s.id, s.name
       ORDER BY revenue DESC`,
      [from, to, storeIds],
    )
  ).rows;

export const topItems = async ({ from, to, storeIds }: Range, limit: number) =>
  (
    await query<{ item_id: string; item_name: string; units_sold: number; revenue: number }>(
      `SELECT oi.item_id, oi.item_name,
              SUM(oi.qty)        AS units_sold,
              SUM(oi.line_total) AS revenue
       FROM order_items_all oi
       JOIN orders_all o ON o.id = oi.order_id
       WHERE o.created_at BETWEEN $1 AND $2
         AND ($3::uuid[] IS NULL OR o.store_id = ANY($3))
       GROUP BY oi.item_id, oi.item_name
       ORDER BY units_sold DESC
       LIMIT $4`,
      [from, to, storeIds, limit],
    )
  ).rows;

export const summary = async ({ from, to, storeIds }: Range) =>
  (
    await query<{
      total_orders: number;
      total_revenue: number;
      avg_order_value: number;
      active_orders: number;
    }>(
      `SELECT COUNT(*)                                          AS total_orders,
              COALESCE(SUM(total_amount), 0)                    AS total_revenue,
              COALESCE(ROUND(AVG(total_amount), 2), 0)          AS avg_order_value,
              COUNT(*) FILTER (WHERE status <> 'COMPLETED')     AS active_orders
       FROM orders_all
       WHERE created_at BETWEEN $1 AND $2
         AND ($3::uuid[] IS NULL OR store_id = ANY($3))`,
      [from, to, storeIds],
    )
  ).rows[0]!;
