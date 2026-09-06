import * as storeModel from "../models/store.model.js";
import type { AuthUser, Store } from "../types/index.js";
import { ApiError } from "../utils/ApiError.js";
import { toPage } from "../utils/cursor.js";
import type { CreateStoreInput, ListStoresQuery, UpdateStoreInput } from "../validators/store.schema.js";

// The single ownership gate. Every write in this service and item.service goes through it,
// so `store_id` from a request body is never what decides access.
export async function assertStoreAccess(storeId: string, user: AuthUser): Promise<Store> {
  const store = await storeModel.findById(storeId);
  if (!store) throw ApiError.notFound("Store not found");
  if (user.role !== "ADMIN" && store.owner_id !== user.id) {
    throw ApiError.forbidden("You do not own this store");
  }
  return store;
}

export async function list(q: ListStoresQuery) {
  return toPage(await storeModel.listActive(q), q.limit);
}

export async function getById(id: string) {
  const store = await storeModel.findByIdWithItems(id);
  if (!store) throw ApiError.notFound("Store not found");
  return store;
}

export const listMine = (user: AuthUser) => storeModel.findByOwner(user.id);

export const create = (user: AuthUser, input: CreateStoreInput) =>
  storeModel.insert(user.id, input);

export async function update(id: string, user: AuthUser, input: UpdateStoreInput) {
  await assertStoreAccess(id, user);
  return storeModel.update(id, input);
}
