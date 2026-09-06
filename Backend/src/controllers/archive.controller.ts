import * as archiveService from "../services/archive.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

export const archiveOldOrders = asyncHandler(async (req, res) => {
  const { days, batchSize } = req.body ?? {};
  res.json(ok(await archiveService.archiveOldOrders(days, batchSize)));
});
