import type { PoolClient } from "pg";
import type { OrderStatus } from "../config/constants.js";
import { query } from "../db/pool.js";
import type { Order, OrderWithItems } from "../types/index.js";
import { decodeCursor } from "../utils/cursor.js";
import type { ListOrdersQuery } from "../validators/order.schema.js";

// One round trip for orders + their lines. A per-order items query would be N+1.
const SELECT_WITH_ITEMS = `
  SELECT o.id, o.store_id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at,
         s.name AS store_name,
         COALESCE(li.items, '[]'::json) AS items
  FROM orders o
  JOIN stores s ON s.id = o.store_id
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object(
             'item_id', oi.item_id, 'name', oi.item_name,
             'qty', oi.qty, 'unit_price', oi.unit_price, 'line_total', oi.line_total
           )) AS items
    FROM order_items oi WHERE oi.order_id = o.id
  ) li ON true`;

export interface Scope {
  userId?: string;
  storeIds?: string[];
}

/** Builds the WHERE fragments shared by list and findById — scope first, filters second. */
function buildWhere(scope: Scope, filters: Partial<ListOrdersQuery>, params: unknown[]) {
  const where: string[] = [];

  if (scope.userId) {
    params.push(scope.userId);
    where.push(`o.user_id = $${params.length}`);
  }
  if (scope.storeIds) {
    params.push(scope.storeIds);
    where.push(`o.store_id = ANY($${params.length}::uuid[])`);
  }
  if (filters.store_id) {
    params.push(filters.store_id);
    where.push(`o.store_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`o.status = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`o.created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`o.created_at <= $${params.length}`);
  }
  return where;
}

export async function list(scope: Scope, filters: ListOrdersQuery) {
  const params: unknown[] = [];
  const where = buildWhere(scope, filters, params);

  if (filters.cursor) {
    const { ts, id } = decodeCursor(filters.cursor);
    params.push(ts, id);
    // Row-value comparison maps straight onto idx_orders_store_created.
    where.push(
      `(o.created_at, o.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
    );
  }
  params.push(filters.limit + 1);

  const { rows } = await query<OrderWithItems>(
    `${SELECT_WITH_ITEMS}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows;
}

export async function findByIdScoped(id: string, scope: Scope) {
  const params: unknown[] = [id];
  const where = ["o.id = $1", ...buildWhere(scope, {}, params)];
  const { rows } = await query<OrderWithItems>(
    `${SELECT_WITH_ITEMS} WHERE ${where.join(" AND ")}`,
    params,
  );
  return rows[0] ?? null;
}

export const findByIdWithItems = async (id: string, client?: PoolClient) => {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(`${SELECT_WITH_ITEMS} WHERE o.id = $1`, [id]);
  return (rows[0] as OrderWithItems | undefined) ?? null;
};

export const findByIdempotencyKey = async (userId: string, key: string) =>
  (
    await query<{ id: string }>(
      "SELECT id FROM orders WHERE user_id = $1 AND idempotency_key = $2",
      [userId, key],
    )
  ).rows[0] ?? null;

/** Compare-and-swap: 0 rows means someone else already moved the order. */
export async function updateStatus(id: string, next: OrderStatus, expected: OrderStatus) {
  const { rows } = await query<Order>(
    `UPDATE orders SET status = $1, updated_at = now()
     WHERE id = $2 AND status = $3
     RETURNING *`,
    [next, id, expected],
  );
  return rows[0] ?? null;
}

export const findRaw = async (id: string) =>
  (await query<Order>("SELECT * FROM orders WHERE id = $1", [id])).rows[0] ?? null;
