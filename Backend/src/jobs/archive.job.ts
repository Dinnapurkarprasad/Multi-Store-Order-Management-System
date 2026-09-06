import cron from "node-cron";
import { env } from "../config/env.js";
import { archiveOldOrders } from "../services/archive.service.js";
import { logger } from "../utils/logger.js";

/** Daily at 03:00. Off unless ENABLE_ARCHIVE_CRON=true. */
export function startArchiveJob() {
  if (!env.ENABLE_ARCHIVE_CRON) return;

  cron.schedule("0 3 * * *", async () => {
    try {
      const result = await archiveOldOrders();
      logger.info(result, "archive job finished");
    } catch (err) {
      logger.error({ err }, "archive job failed");
    }
  });
  logger.info("archive cron enabled (0 3 * * *)");
}
