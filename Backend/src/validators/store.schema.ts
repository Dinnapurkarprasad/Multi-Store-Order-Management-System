import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../config/constants.js";

export const uuidParam = z.object({ id: z.string().uuid() });
export const storeIdParam = z.object({ storeId: z.string().uuid() });

export const listStoresQuery = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
});

export const createStoreSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  image_url: z.string().url().max(2048).optional(),
});

export const updateStoreSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    // explicit null clears the field; omitting the key leaves it untouched
    description: z.string().trim().max(500).nullable().optional(),
    image_url: z.string().url().max(2048).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export type ListStoresQuery = z.infer<typeof listStoresQuery>;
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
