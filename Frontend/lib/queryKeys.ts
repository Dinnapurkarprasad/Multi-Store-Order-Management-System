// Every key in one file (PRD §4). The owner rail invalidates and patches
// ["orders"] wholesale on socket events, so anything order-shaped must live
// under that prefix.
export const keys = {
  me: ["me"] as const,

  stores: (params?: Record<string, unknown>) => ["stores", params ?? {}] as const,
  store: (id: string) => ["store", id] as const,
  items: (storeId: string) => ["items", storeId] as const,

  orders: (params?: Record<string, unknown>) => ["orders", params ?? {}] as const,
  order: (id: string) => ["order", id] as const,

  analytics: (kind: string, params?: Record<string, unknown>) =>
    ["analytics", kind, params ?? {}] as const,
};
