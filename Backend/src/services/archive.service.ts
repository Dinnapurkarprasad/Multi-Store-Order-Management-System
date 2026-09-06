import { env } from "../config/env.js";
import { withTransaction } from "../db/pool.js";

/**
 * Moves orders older than `days` into the archive tables, in batches.
 * Batching matters: one giant DELETE would hold locks and blow up the WAL.
 * Line items are copied before the orders, and the DELETE relies on ON DELETE CASCADE
 * to clear the live order_items rows.
 */
export async function archiveOldOrders(days = env.ARCHIVE_AFTER_DAYS, batchSize = env.ARCHIVE_BATCH_SIZE) {
  const startedAt = Date.now();
  let archived = 0;
  let batches = 0;

  for (;;) {
    const moved = await withTransaction(async (client) => {
      // SKIP LOCKED keeps this safe if the cron and a manual call overlap.
      const { rows } = await client.query<{ id: string }>(
        `SELECT id FROM orders
         WHERE created_at < now() - ($1 || ' days')::interval
         ORDER BY created_at
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        [days, batchSize],
      );
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return 0;

      await client.query(
        `INSERT INTO order_items_archive (id, order_id, item_id, item_name, unit_price, qty, line_total)
         SELECT oi.id, oi.order_id, oi.item_id, oi.item_name, oi.unit_price, oi.qty, oi.line_total
         FROM order_items oi
         WHERE oi.order_id = ANY($1::uuid[])
         ON CONFLICT (id) DO NOTHING`,
        [ids],
      );
      await client.query(
        `INSERT INTO orders_archive (id, store_id, user_id, total_amount, status, created_at, updated_at)
         SELECT o.id, o.store_id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at
         FROM orders o
         WHERE o.id = ANY($1::uuid[])
         ON CONFLICT (id) DO NOTHING`,
        [ids],
      );
      const { rowCount } = await client.query("DELETE FROM orders WHERE id = ANY($1::uuid[])", [ids]);
      return rowCount ?? 0;
    });

    if (moved === 0) break;
    archived += moved;
    batches++;
  }

  return { archived, batches, durationMs: Date.now() - startedAt };
}
