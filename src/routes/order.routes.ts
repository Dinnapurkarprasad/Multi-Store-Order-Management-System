import { Router } from "express";
import * as controller from "../controllers/order.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createOrderSchema, listOrdersQuery, updateStatusSchema } from "../validators/order.schema.js";
import { uuidParam } from "../validators/store.schema.js";

export const orderRouter = Router();

orderRouter.use(requireAuth);

orderRouter.get("/", validate({ query: listOrdersQuery }), controller.list);
orderRouter.get("/:id", validate({ params: uuidParam }), controller.getById);
orderRouter.post("/", requireRole("USER"), validate({ body: createOrderSchema }), controller.create);
orderRouter.patch(
  "/:id/status",
  requireRole("STORE_OWNER", "ADMIN"),
  validate({ params: uuidParam, body: updateStatusSchema }),
  controller.updateStatus,
);
