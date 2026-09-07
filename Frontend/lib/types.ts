// Shapes copied from Backend/docs/API.md. That file is the contract — if
// something here disagrees with it, this file is the one that's wrong.

export type Role = "USER" | "STORE_OWNER" | "ADMIN";

// There is no CANCELLED status. Legal transitions are PLACED → PREPARING →
// COMPLETED and nothing else; anything else is a 409.
export type OrderStatus = "PLACED" | "PREPARING" | "COMPLETED";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  image_url: string | null;
  created_at: string;
};

export type Store = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type Item = {
  id: string;
  name: string;
  price: number; // a JSON number — 349 or 349.5, never "349"
  image_url: string | null;
  is_available: boolean;
  created_at: string;
};

// GET /stores/:id returns the store with its available items in ONE call.
// `items` is [] when there are none, never null.
export type StoreWithItems = Store & { items: Item[] };

export type OrderItem = {
  item_id: string;
  name: string; // snapshotted at order time, so a renamed item keeps its label
  qty: number;
  unit_price: number;
  line_total: number;
};

export type Order = {
  id: string;
  store_id: string;
  user_id: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  store_name: string; // joined in — no extra store lookup to render a list
  items: OrderItem[];
};

// The slim socket payload for order:status_updated. No `items` — patch the
// cached order by id, never replace it with this.
export type OrderStatusEvent = Pick<
  Order,
  "id" | "store_id" | "user_id" | "status" | "updated_at"
>;

export type AuthSession = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

// Present only on paginated endpoints. Absent on /stores/mine, item lists and
// every single-object response — don't assume it's there.
export type Meta = {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type Page<T> = { data: T[]; meta: Meta };

// ── Analytics ─────────────────────────────────────────────────────────────
// All four read views that union the live and archived tables, so archiving
// never moves an analytics number.

export type AnalyticsSummary = {
  total_orders: number;
  // Counts EVERY status. Not the same as revenue-per-store's `revenue`, which
  // counts COMPLETED only — they're meant to differ, so label them differently.
  total_revenue: number;
  avg_order_value: number;
  active_orders: number; // not yet COMPLETED — the owner's live workload
};

export type OrdersPerDay = {
  day: string; // plain YYYY-MM-DD, deliberately not a timestamp. Pass to
  // recharts as-is; new Date() here plots points a day early.
  orders: number;
  revenue: number;
};

export type RevenuePerStore = {
  store_id: string;
  store_name: string;
  order_count: number;
  revenue: number; // COMPLETED orders only — this is earned revenue
};

export type TopItem = {
  item_id: string;
  item_name: string; // snapshotted at order time
  units_sold: number;
  revenue: number;
};

export type ArchiveResult = {
  archived: number;
  batches: number;
  durationMs: number;
};

export type FieldErrors = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
};

export type Envelope<T> =
  | { success: true; data: T; meta?: Meta }
  | {
      success: false;
      error: { code: string; message: string; details?: FieldErrors };
    };
