import { Router } from "express";
import { z } from "zod";
import * as controller from "../controllers/archive.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

const bodySchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).optional(),
  batchSize: z.coerce.number().int().min(1).max(10_000).optional(),
});

export const archiveRouter = Router();

archiveRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  validate({ body: bodySchema }),
  controller.archiveOldOrders,
);
