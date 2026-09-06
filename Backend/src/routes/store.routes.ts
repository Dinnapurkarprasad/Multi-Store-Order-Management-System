import { Router } from "express";
import * as controller from "../controllers/store.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createStoreSchema,
  listStoresQuery,
  updateStoreSchema,
  uuidParam,
} from "../validators/store.schema.js";
import { storeItemsRouter } from "./item.routes.js";

export const storeRouter = Router();

// `/mine` must be registered before `/:id`, or Express matches "mine" as an id.
storeRouter.get("/mine", requireAuth, requireRole("STORE_OWNER", "ADMIN"), controller.listMine);
storeRouter.get("/", validate({ query: listStoresQuery }), controller.list);
storeRouter.get("/:id", validate({ params: uuidParam }), controller.getById);

storeRouter.post(
  "/",
  requireAuth,
  requireRole("STORE_OWNER", "ADMIN"),
  validate({ body: createStoreSchema }),
  controller.create,
);
storeRouter.patch(
  "/:id",
  requireAuth,
  requireRole("STORE_OWNER", "ADMIN"),
  validate({ params: uuidParam, body: updateStoreSchema }),
  controller.update,
);

storeRouter.use("/:storeId/items", storeItemsRouter);
