import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../config/constants.js";
import { ApiError } from "./ApiError.js";

export interface AccessPayload {
  sub: string;
  role: Role;
  email: string;
}
export interface RefreshPayload {
  sub: string;
  jti: string;
}

export const signAccessToken = (p: AccessPayload) =>
  jwt.sign(p, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES } as jwt.SignOptions);

export const signRefreshToken = (userId: string) => {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  } as jwt.SignOptions);
  // expires_at mirrors the JWT's own exp so the row can never outlive the token
  const { exp } = jwt.decode(token) as { exp: number };
  return { token, jti, expiresAt: new Date(exp * 1000) };
};

export function verifyAccessToken(token: string): AccessPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token");
  }
}

export function verifyRefreshToken(token: string): RefreshPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }
}

// Refresh tokens are never stored raw.
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
