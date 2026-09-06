import { Router } from "express";
import * as controller from "../controllers/analytics.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { analyticsQuery, topItemsQuery } from "../validators/analytics.schema.js";

export const analyticsRouter = Router();

// USER has no analytics access at all; owners are scoped to their own stores in the service.
analyticsRouter.use(requireAuth, requireRole("ADMIN", "STORE_OWNER"));

analyticsRouter.get("/orders-per-day", validate({ query: analyticsQuery }), controller.ordersPerDay);
analyticsRouter.get(
  "/revenue-per-store",
  validate({ query: analyticsQuery }),
  controller.revenuePerStore,
);
analyticsRouter.get("/top-items", validate({ query: topItemsQuery }), controller.topItems);
analyticsRouter.get("/summary", validate({ query: analyticsQuery }), controller.summary);
