import * as analyticsService from "../services/analytics.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

export const ordersPerDay = asyncHandler(async (req, res) => {
  res.json(ok(await analyticsService.ordersPerDay(req.user!, req.query as never)));
});

export const revenuePerStore = asyncHandler(async (req, res) => {
  res.json(ok(await analyticsService.revenuePerStore(req.user!, req.query as never)));
});

export const topItems = asyncHandler(async (req, res) => {
  res.json(ok(await analyticsService.topItems(req.user!, req.query as never)));
});

export const summary = asyncHandler(async (req, res) => {
  res.json(ok(await analyticsService.summary(req.user!, req.query as never)));
});
