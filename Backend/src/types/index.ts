import type { OrderStatus, Role } from "../config/constants.js";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  image_url: string | null;
  created_at: string;
}

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  store_id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
}

export interface OrderLine {
  item_id: string;
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: string;
  store_id: string;
  user_id: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends Order {
  store_name: string;
  items: OrderLine[];
}

export interface Page<T> {
  rows: T[];
  meta: { limit: number; hasMore: boolean; nextCursor: string | null };
}
