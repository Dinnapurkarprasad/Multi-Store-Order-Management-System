import type { OrderStatus } from "../config/constants.js";
import { STATUS_TRANSITIONS } from "../config/constants.js";
import { withTransaction } from "../db/pool.js";
import * as orderModel from "../models/order.model.js";
import * as storeModel from "../models/store.model.js";
import { emitOrderCreated, emitOrderStatusUpdated } from "../realtime/events.js";
import type { AuthUser, OrderWithItems } from "../types/index.js";
import { ApiError } from "../utils/ApiError.js";
import { toPage } from "../utils/cursor.js";
import type { CreateOrderInput, ListOrdersQuery } from "../validators/order.schema.js";
import { assertStoreAccess } from "./store.service.js";

/** Role scoping is applied here, not in the controller, so it cannot be skipped. */
async function scopeFor(user: AuthUser, requestedStoreId?: string): Promise<orderModel.Scope> {
  if (user.role === "ADMIN") return {};
  if (user.role === "USER") return { userId: user.id };

  const storeIds = await storeModel.idsByOwner(user.id);
  if (requestedStoreId && !storeIds.includes(requestedStoreId)) {
    throw ApiError.forbidden("You do not own this store");
  }
  return { storeIds };
}

export async function list(user: AuthUser, filters: ListOrdersQuery) {
  const scope = await scopeFor(user, filters.store_id);
  return toPage(await orderModel.list(scope, filters), filters.limit);
}

export async function getById(id: string, user: AuthUser) {
  const scope = await scopeFor(user);
  const order = await orderModel.findByIdScoped(id, scope);
  // 404 rather than 403 so order ids can't be probed.
  if (!order) throw ApiError.notFound("Order not found");
  return order;
}

export async function create(userId: string, input: CreateOrderInput) {
  const qtyById = new Map<string, number>();
  for (const line of input.items) {
    qtyById.set(line.item_id, (qtyById.get(line.item_id) ?? 0) + line.qty);
  }
  const ids = [...qtyById.keys()];

  if (input.idempotencyKey) {
    const existing = await orderModel.findByIdempotencyKey(userId, input.idempotencyKey);
    if (existing) return { order: (await orderModel.findByIdWithItems(existing.id))!, replayed: true };
  }

  const orderId = await withTransaction(async (client) => {
    // Prices come from the DB under a share lock — anything client-sent is ignored.
    const { rows: items } = await client.query<{ id: string; name: string; price: number }>(
      `SELECT id, name, price FROM items
       WHERE id = ANY($1::uuid[]) AND store_id = $2 AND is_available = true
       FOR SHARE`,
      [ids, input.store_id],
    );
    if (items.length !== ids.length) {
      throw ApiError.badRequest("Some items are invalid or unavailable for this store");
    }

    const total = items.reduce((sum, it) => sum + Number(it.price) * qtyById.get(it.id)!, 0);

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO orders (store_id, user_id, total_amount, idempotency_key)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [input.store_id, userId, total.toFixed(2), input.idempotencyKey ?? null],
    );
    const created = rows[0]!;

    // Single multi-row insert, never a loop.
    await client.query(
      `INSERT INTO order_items (order_id, item_id, item_name, unit_price, qty)
       SELECT $1, * FROM UNNEST($2::uuid[], $3::text[], $4::numeric[], $5::int[])`,
      [
        created.id,
        items.map((i) => i.id),
        items.map((i) => i.name),
        items.map((i) => i.price),
        items.map((i) => qtyById.get(i.id)!),
      ],
    );
    return created.id;
  }).catch(async (err: { code?: string; constraint?: string }) => {
    // Concurrent request with the same Idempotency-Key won the race.
    if (err?.code === "23505" && input.idempotencyKey) {
      const existing = await orderModel.findByIdempotencyKey(userId, input.idempotencyKey);
      if (existing) return existing.id;
    }
    throw err;
  });

  const order = (await orderModel.findByIdWithItems(orderId))!;
  emitOrderCreated(order);
  return { order, replayed: false };
}

export async function updateStatus(id: string, next: OrderStatus, user: AuthUser) {
  const order = await orderModel.findRaw(id);
  if (!order) throw ApiError.notFound("Order not found");
  await assertStoreAccess(order.store_id, user);

  if (!STATUS_TRANSITIONS[order.status].includes(next)) {
    throw ApiError.conflict(
      "INVALID_STATUS_TRANSITION",
      `Cannot move an order from ${order.status} to ${next}`,
    );
  }

  const updated = await orderModel.updateStatus(id, next, order.status);
  // 0 rows: another request changed the status between our read and this write.
  if (!updated) {
    throw ApiError.conflict("INVALID_STATUS_TRANSITION", "Order status changed concurrently");
  }

  emitOrderStatusUpdated(updated);
  return (await orderModel.findByIdWithItems(id)) as OrderWithItems;
}
