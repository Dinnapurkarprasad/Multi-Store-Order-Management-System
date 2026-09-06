import { withTransaction } from "../db/pool.js";
import * as tokenModel from "../models/token.model.js";
import * as userModel from "../models/user.model.js";
import type { User } from "../types/index.js";
import { ApiError } from "../utils/ApiError.js";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "../validators/auth.schema.js";

async function issueTokens(user: User) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const { token: refreshToken, expiresAt } = signRefreshToken(user.id);
  await tokenModel.insert({ userId: user.id, hash: hashToken(refreshToken), expiresAt });
  return { user, accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  if (await userModel.findByEmail(input.email)) {
    throw ApiError.conflict("CONFLICT", "Email already registered");
  }
  const user = await userModel.insert({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
  });
  return issueTokens(user);
}

export async function login(input: LoginInput) {
  const row = await userModel.findByEmail(input.email);
  // Same error either way so the endpoint can't be used to enumerate accounts.
  if (!row || !(await verifyPassword(input.password, row.password_hash))) {
    throw ApiError.unauthorized("Invalid credentials");
  }
  const { password_hash: _drop, ...user } = row;
  return issueTokens(user);
}

export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const hash = hashToken(refreshToken);

  return withTransaction(async (client) => {
    const stored = await tokenModel.findByHash(hash, client);
    if (!stored) throw ApiError.unauthorized("Refresh token not recognised");

    // A revoked token being replayed means it leaked — burn every session for this user.
    if (stored.revoked_at) {
      await tokenModel.revokeAllForUser(stored.user_id, client);
      throw ApiError.unauthorized("Refresh token reuse detected", "TOKEN_REUSE_DETECTED");
    }
    if (new Date(stored.expires_at) <= new Date()) throw ApiError.unauthorized("Refresh token expired");

    const user = await userModel.findById(payload.sub);
    if (!user) throw ApiError.unauthorized("User no longer exists");

    await tokenModel.revokeByHash(hash, client);
    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const { token: nextRefresh, expiresAt } = signRefreshToken(user.id);
    await tokenModel.insert({ userId: user.id, hash: hashToken(nextRefresh), expiresAt }, client);

    return { user, accessToken, refreshToken: nextRefresh };
  });
}

// Idempotent: logging out with an unknown or already-revoked token is still a success.
export async function logout(refreshToken: string) {
  await tokenModel.revokeByHash(hashToken(refreshToken));
}

export async function me(userId: string) {
  const user = await userModel.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return user;
}

// Email and role are deliberately not editable here.
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await userModel.update(userId, input);
  if (!user) throw ApiError.notFound("User not found");
  return user;
}
