import { query } from "../db/pool.js";
import type { Item } from "../types/index.js";
import { buildSet } from "../utils/sql.js";
import type { CreateItemInput, UpdateItemInput } from "../validators/item.schema.js";

export const findById = async (id: string) =>
  (await query<Item>("SELECT * FROM items WHERE id = $1", [id])).rows[0] ?? null;

export const findByStore = async (storeId: string, available?: boolean) =>
  (
    await query<Item>(
      `SELECT * FROM items
       WHERE store_id = $1 AND ($2::boolean IS NULL OR is_available = $2)
       ORDER BY name`,
      [storeId, available ?? null],
    )
  ).rows;

export const insert = async (storeId: string, data: CreateItemInput) =>
  (
    await query<Item>(
      "INSERT INTO items (store_id, name, price, image_url) VALUES ($1, $2, $3, $4) RETURNING *",
      [storeId, data.name, data.price, data.image_url ?? null],
    )
  ).rows[0] as Item;

export async function update(id: string, data: UpdateItemInput) {
  const params: unknown[] = [id];
  const { rows } = await query<Item>(
    `UPDATE items SET ${buildSet(data, params)} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] as Item;
}
