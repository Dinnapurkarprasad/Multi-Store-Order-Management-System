import * as itemService from "../services/item.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

export const listByStore = asyncHandler(async (req, res) => {
  const { available } = req.query as { available?: boolean };
  res.json(ok(await itemService.listByStore(req.params.storeId!, available)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(ok(await itemService.create(req.params.storeId!, req.user!, req.body)));
});

export const update = asyncHandler(async (req, res) => {
  res.json(ok(await itemService.update(req.params.id!, req.user!, req.body)));
});

export const remove = asyncHandler(async (req, res) => {
  res.json(ok(await itemService.remove(req.params.id!, req.user!)));
});
