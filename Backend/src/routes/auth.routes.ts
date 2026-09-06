import { Router } from "express";
import * as controller from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
} from "../validators/auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", authLimiter, validate({ body: registerSchema }), controller.register);
authRouter.post("/login", authLimiter, validate({ body: loginSchema }), controller.login);
authRouter.post("/refresh", validate({ body: refreshSchema }), controller.refresh);
authRouter.post("/logout", validate({ body: refreshSchema }), controller.logout);
authRouter.get("/me", requireAuth, controller.me);
authRouter.patch(
  "/me",
  requireAuth,
  validate({ body: updateProfileSchema }),
  controller.updateProfile,
);
