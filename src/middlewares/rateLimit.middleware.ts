import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { fail } from "../utils/response.js";

const handler = (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => {
  res.status(429).json(fail("RATE_LIMITED", "Too many requests, try again later"));
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Spec'd 10/15min in production; relaxed in dev so `npm run verify` (6 logins) can repeat.
  limit: env.NODE_ENV === "production" ? 10 : 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler,
});
