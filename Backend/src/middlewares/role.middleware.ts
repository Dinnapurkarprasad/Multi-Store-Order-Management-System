import type { NextFunction, Request, Response } from "express";
import type { Role } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";

// Middleware checks the role only; ownership is always checked in the service layer.
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden("Insufficient role"));
    next();
  };
