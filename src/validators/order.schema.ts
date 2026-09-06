import { z } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  MAX_ITEM_QTY,
  MAX_ORDER_ITEMS,
  MAX_PAGE_SIZE,
  ORDER_STATUS,
} from "../config/constants.js";

export const createOrderSchema = z.object({
  store_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        item_id: z.string().uuid(),
        qty: z.number().int().min(1).max(MAX_ITEM_QTY),
      }),
    )
    .min(1)
    .max(MAX_ORDER_ITEMS),
});

export const listOrdersQuery = z.object({
  store_id: z.string().uuid().optional(),
  status: z.enum(ORDER_STATUS).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
});

export const updateStatusSchema = z.object({ status: z.enum(ORDER_STATUS) });

export type CreateOrderInput = z.infer<typeof createOrderSchema> & { idempotencyKey?: string };
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
