import * as authService from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

export const register = asyncHandler(async (req, res) => {
  res.status(201).json(ok(await authService.register(req.body)));
});

export const login = asyncHandler(async (req, res) => {
  res.json(ok(await authService.login(req.body)));
});

export const refresh = asyncHandler(async (req, res) => {
  res.json(ok(await authService.refresh(req.body.refreshToken)));
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.json(ok({ loggedOut: true }));
});

export const me = asyncHandler(async (req, res) => {
  res.json(ok(await authService.me(req.user!.id)));
});

export const updateProfile = asyncHandler(async (req, res) => {
  res.json(ok(await authService.updateProfile(req.user!.id, req.body)));
});
