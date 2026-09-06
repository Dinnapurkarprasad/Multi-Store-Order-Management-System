import * as orderService from "../services/order.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

export const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await orderService.list(req.user!, req.query as never);
  res.json(ok(rows, meta));
});

export const getById = asyncHandler(async (req, res) => {
  res.json(ok(await orderService.getById(req.params.id!, req.user!)));
});

export const create = asyncHandler(async (req, res) => {
  const idempotencyKey = req.get("Idempotency-Key") ?? undefined;
  const { order, replayed } = await orderService.create(req.user!.id, { ...req.body, idempotencyKey });
  res.status(replayed ? 200 : 201).json(ok(order));
});

export const updateStatus = asyncHandler(async (req, res) => {
  res.json(ok(await orderService.updateStatus(req.params.id!, req.body.status, req.user!)));
});
