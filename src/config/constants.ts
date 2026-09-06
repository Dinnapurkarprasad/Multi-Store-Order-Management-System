export const ROLES = ["ADMIN", "STORE_OWNER", "USER"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUS = ["PLACED", "PREPARING", "COMPLETED"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

// Single source of truth for PATCH /orders/:id/status — never re-encoded as if-chains.
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["PREPARING"],
  PREPARING: ["COMPLETED"],
  COMPLETED: [],
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_ORDER_ITEMS = 50;
export const MAX_ITEM_QTY = 100;
export const MAX_ANALYTICS_RANGE_DAYS = 366;
