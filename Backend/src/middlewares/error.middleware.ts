import type { NextFunction, Request, Response } from "express";
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
  res.status(500).json(fail("INTERNAL_ERROR", "Something went wrong"));
}
