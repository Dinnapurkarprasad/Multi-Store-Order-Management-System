import * as itemModel from "../models/item.model.js";
import type { AuthUser } from "../types/index.js";
import { ApiError } from "../utils/ApiError.js";
import type { CreateItemInput, UpdateItemInput } from "../validators/item.schema.js";
import { assertStoreAccess } from "./store.service.js";

export const listByStore = (storeId: string, available?: boolean) =>
  itemModel.findByStore(storeId, available);

export async function create(storeId: string, user: AuthUser, input: CreateItemInput) {
  await assertStoreAccess(storeId, user);
  return itemModel.insert(storeId, input);
}

// Ownership is resolved through the item's own store_id from the DB, never a body field.
async function loadOwned(itemId: string, user: AuthUser) {
  const item = await itemModel.findById(itemId);
  if (!item) throw ApiError.notFound("Item not found");
  await assertStoreAccess(item.store_id, user);
  return item;
}

export async function update(itemId: string, user: AuthUser, input: UpdateItemInput) {
  await loadOwned(itemId, user);
  return itemModel.update(itemId, input);
}

// Soft delete: a hard delete would break order history through order_items.item_id.
export async function remove(itemId: string, user: AuthUser) {
  await loadOwned(itemId, user);
  return itemModel.update(itemId, { is_available: false });
}
