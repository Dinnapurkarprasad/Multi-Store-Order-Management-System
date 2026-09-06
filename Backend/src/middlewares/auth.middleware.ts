import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/jwt.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(ApiError.unauthorized("Missing bearer token"));

  try {
    const { sub, role, email } = verifyAccessToken(header.slice(7));
    req.user = { id: sub, role, email };
    next();
  } catch (e) {
    next(e);
  }
}
