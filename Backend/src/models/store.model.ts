import { query } from "../db/pool.js";
import type { Item, Store } from "../types/index.js";
import { decodeCursor } from "../utils/cursor.js";
import { buildSet } from "../utils/sql.js";
import type { CreateStoreInput, ListStoresQuery, UpdateStoreInput } from "../validators/store.schema.js";

export const findById = async (id: string) =>
  (await query<Store>("SELECT * FROM stores WHERE id = $1", [id])).rows[0] ?? null;

export const findByOwner = async (ownerId: string) =>
  (await query<Store>("SELECT * FROM stores WHERE owner_id = $1 ORDER BY created_at DESC", [ownerId]))
    .rows;

export const idsByOwner = async (ownerId: string) =>
  (await query<{ id: string }>("SELECT id FROM stores WHERE owner_id = $1", [ownerId])).rows.map(
    (r) => r.id,
  );

export async function listActive({ q, limit, cursor }: ListStoresQuery) {
  const where = ["is_active = true"];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q}%`);
    where.push(`name ILIKE $${params.length}`);
  }
  if (cursor) {
    const { ts, id } = decodeCursor(cursor);
    params.push(ts, id);
    where.push(`(created_at, id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
  }
  params.push(limit + 1);

  const { rows } = await query<Store>(
    `SELECT * FROM stores
     WHERE ${where.join(" AND ")}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows;
}

// Store + its available items in one round trip, not two.
export async function findByIdWithItems(id: string) {
  const { rows } = await query<Store & { items: Item[] }>(
    `SELECT s.*, COALESCE(i.items, '[]'::json) AS items
     FROM stores s
     LEFT JOIN LATERAL (
       SELECT json_agg(json_build_object(
                'id', it.id, 'name', it.name, 'price', it.price,
                'image_url', it.image_url,
                'is_available', it.is_available, 'created_at', it.created_at
              ) ORDER BY it.name) AS items
       FROM items it WHERE it.store_id = s.id AND it.is_available = true
     ) i ON true
     WHERE s.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export const insert = async (ownerId: string, data: CreateStoreInput) =>
  (
    await query<Store>(
      `INSERT INTO stores (owner_id, name, description, image_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [ownerId, data.name, data.description ?? null, data.image_url ?? null],
    )
  ).rows[0] as Store;

export async function update(id: string, data: UpdateStoreInput) {
  const params: unknown[] = [id];
  const { rows } = await query<Store>(
    `UPDATE stores SET ${buildSet(data, params)} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] as Store;
}
