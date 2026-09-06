import { z } from "zod";

export const listItemsQuery = z.object({
  available: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const createItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().nonnegative().max(9_999_999),
  image_url: z.string().url().max(2048).optional(),
});

export const updateItemSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    price: z.number().nonnegative().max(9_999_999).optional(),
    // explicit null clears the image; omitting the key leaves it untouched
    image_url: z.string().url().max(2048).nullable().optional(),
    is_available: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
