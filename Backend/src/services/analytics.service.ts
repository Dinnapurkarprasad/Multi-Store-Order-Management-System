import { MAX_ANALYTICS_RANGE_DAYS } from "../config/constants.js";
import * as analyticsModel from "../models/analytics.model.js";
import type { Range } from "../models/analytics.model.js";
import * as storeModel from "../models/store.model.js";
import type { AuthUser } from "../types/index.js";
import { ApiError } from "../utils/ApiError.js";
import type { AnalyticsQuery, TopItemsQuery } from "../validators/analytics.schema.js";

const DAY = 86_400_000;

/**
 * Resolves the date window and the set of stores the caller may see.
 * ADMIN -> all stores (or the one requested). STORE_OWNER -> only stores they own.
 */
async function resolveRange(user: AuthUser, q: AnalyticsQuery): Promise<Range> {
  const to = q.to ?? new Date();
  const from = q.from ?? new Date(to.getTime() - 30 * DAY);

  if (from > to) throw ApiError.badRequest("`from` must be before `to`");
  if ((to.getTime() - from.getTime()) / DAY > MAX_ANALYTICS_RANGE_DAYS) {
    throw ApiError.badRequest(`Date range cannot exceed ${MAX_ANALYTICS_RANGE_DAYS} days`);
  }

  if (user.role === "ADMIN") {
    return { from, to, storeIds: q.store_id ? [q.store_id] : null };
  }

  const owned = await storeModel.idsByOwner(user.id);
  if (q.store_id) {
    if (!owned.includes(q.store_id)) throw ApiError.forbidden("You do not own this store");
    return { from, to, storeIds: [q.store_id] };
  }
  return { from, to, storeIds: owned };
}

export async function ordersPerDay(user: AuthUser, q: AnalyticsQuery) {
  return analyticsModel.ordersPerDay(await resolveRange(user, q));
}

export async function revenuePerStore(user: AuthUser, q: AnalyticsQuery) {
  return analyticsModel.revenuePerStore(await resolveRange(user, q));
}

export async function topItems(user: AuthUser, q: TopItemsQuery) {
  return analyticsModel.topItems(await resolveRange(user, q), q.limit);
}

export async function summary(user: AuthUser, q: AnalyticsQuery) {
  return analyticsModel.summary(await resolveRange(user, q));
}
