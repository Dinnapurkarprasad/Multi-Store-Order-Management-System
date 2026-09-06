import type { Server } from "socket.io";
import type { Order, OrderWithItems } from "../types/index.js";
import { ADMIN_ROOM, storeRoom, userRoom } from "./rooms.js";

// Injected from server.ts so services import a plain function and stay testable.
let io: Server | null = null;
export const setIo = (server: Server) => {
  io = server;
};

const broadcast = (order: Pick<Order, "store_id" | "user_id">, event: string, payload: unknown) => {
  if (!io) return;
  io.to(storeRoom(order.store_id)).to(userRoom(order.user_id)).to(ADMIN_ROOM).emit(event, payload);
};

// Both are called by the service AFTER the transaction commits — never inside it,
// or clients can see an order that then rolls back.
export const emitOrderCreated = (order: OrderWithItems) =>
  broadcast(order, "order:created", order);

export const emitOrderStatusUpdated = (order: Order) =>
  broadcast(order, "order:status_updated", {
    id: order.id,
    store_id: order.store_id,
    user_id: order.user_id,
    status: order.status,
    updated_at: order.updated_at,
  });
