import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { logger } from "./utils/logger.js";

const server = createServer(app);

server.listen(env.PORT, () =>
  logger.info(
    `status ok — server is up on http://localhost:${env.PORT} (health: http://localhost:${env.PORT}/health)`,
  ),
);

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
}
