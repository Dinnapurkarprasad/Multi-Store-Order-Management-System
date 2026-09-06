import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool, warmUp } from "./db/pool.js";
import { startArchiveJob } from "./jobs/archive.job.js";
import { initSocket } from "./realtime/socket.js";
import { logger } from "./utils/logger.js";

const server = createServer(app);
const io = initSocket(server);

server.listen(env.PORT, async () => {
  logger.info(
    `status ok — server is up on http://localhost:${env.PORT} (health: http://localhost:${env.PORT}/health)`,
  );
  await warmUp();
  startArchiveJob();
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down`);
    io.close();
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
}
