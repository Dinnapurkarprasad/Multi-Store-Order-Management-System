import * as storeService from "../services/store.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

export const list = asyncHandler(async (req, res) => {
  const { rows, meta } = await storeService.list(req.query as never);
  res.json(ok(rows, meta));
});

export const listMine = asyncHandler(async (req, res) => {
  res.json(ok(await storeService.listMine(req.user!)));
});

export const getById = asyncHandler(async (req, res) => {
  res.json(ok(await storeService.getById(req.params.id!)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(ok(await storeService.create(req.user!, req.body)));
});

export const update = asyncHandler(async (req, res) => {
  res.json(ok(await storeService.update(req.params.id!, req.user!, req.body)));
});
