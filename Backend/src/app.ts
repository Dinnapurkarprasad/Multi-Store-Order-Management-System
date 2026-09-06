import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { query } from "./db/pool.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";
import { apiRouter } from "./routes/index.js";
import { logger } from "./utils/logger.js";
import { ok } from "./utils/response.js";

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(compression());
app.use(express.json({ limit: "100kb" }));
// Uptime pings would otherwise flood the logs with ~300 lines a day.
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/ping" } }));

// Liveness only — deliberately does NOT touch the database, so an uptime pinger can keep
// the free instance awake without also keeping Neon awake and burning compute hours.
app.get("/ping", (_req, res) => {
  res.json(ok({ status: "ok", uptime: process.uptime() }));
});

// Readiness — checks the database too.
app.get("/health", async (_req, res) => {
  let db = "down";
  try {
    await query("SELECT 1");
    db = "up";
  } catch {
    // health must report, not throw
  }
  res.json(ok({ status: "ok", db, uptime: process.uptime() }));
});

app.use("/api", apiLimiter, apiRouter);

app.use(notFound);
app.use(errorHandler);
