import { z } from "zod";

export const analyticsQuery = z.object({
  store_id: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const topItemsQuery = analyticsQuery.extend({
  limit: z.coerce.number().int().min(1).max(50).default(5),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuery>;
export type TopItemsQuery = z.infer<typeof topItemsQuery>;
