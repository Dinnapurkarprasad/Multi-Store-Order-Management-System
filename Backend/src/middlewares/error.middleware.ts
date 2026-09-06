import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { fail } from "../utils/response.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json(fail("NOT_FOUND", "Route not found"));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json(fail(err.code, err.message, err.details));
    return;
  }
  // Postgres unique violation -> 409 instead of a 500
  if ((err as { code?: string })?.code === "23505") {
    res.status(409).json(fail("CONFLICT", "Resource already exists"));
    return;
  }
  req.log?.error({ err }, "unhandled error");
  // Fallback: pino-http's req.log is absent if the error escapes before that middleware.
  console.error("unhandled error:", err);

  // Outside production the real cause is echoed back — an opaque 500 is unusable while
  // developing. Never leaked in production, where it could expose internals.
  const details =
    env.NODE_ENV === "production" ? undefined : { message: (err as Error)?.message };
  res.status(500).json(fail("INTERNAL_ERROR", "Something went wrong", details));
}
