import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError.js";

// Validates and REPLACES req.body/query/params with the parsed (typed, coerced) values.
export const validate =
  (schemas: { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as never;
      if (schemas.query) req.query = schemas.query.parse(req.query) as never;
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (e) {
      if (e instanceof ZodError) return next(ApiError.badRequest("Invalid request", e.flatten()));
      next(e);
    }
  };
