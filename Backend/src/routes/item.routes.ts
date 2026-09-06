import { Router } from "express";
import * as controller from "../controllers/item.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createItemSchema, listItemsQuery, updateItemSchema } from "../validators/item.schema.js";
import { storeIdParam, uuidParam } from "../validators/store.schema.js";

// Nested under /stores/:storeId/items — mergeParams keeps :storeId visible here.
export const storeItemsRouter = Router({ mergeParams: true });

storeItemsRouter.get(
  "/",
  validate({ params: storeIdParam, query: listItemsQuery }),
  controller.listByStore,
);
storeItemsRouter.post(
  "/",
  requireAuth,
  requireRole("STORE_OWNER", "ADMIN"),
  validate({ params: storeIdParam, body: createItemSchema }),
  controller.create,
);

export const itemRouter = Router();

itemRouter.patch(
  "/:id",
  requireAuth,
  requireRole("STORE_OWNER", "ADMIN"),
  validate({ params: uuidParam, body: updateItemSchema }),
  controller.update,
);
itemRouter.delete(
  "/:id",
  requireAuth,
  requireRole("STORE_OWNER", "ADMIN"),
  validate({ params: uuidParam }),
  controller.remove,
);
