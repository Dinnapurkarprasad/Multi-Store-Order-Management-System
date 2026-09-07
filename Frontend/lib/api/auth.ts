// Any role. Register, sign in, sign out, and your own profile.
import { http } from "./client";
import type { AuthSession, Role, User } from "../types";

export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & { name: string; role: Role };

export const login = (input: LoginInput) =>
  http<AuthSession>({ method: "post", url: "/auth/login", data: input });

// Only USER and STORE_OWNER are reachable — the API rejects role: "ADMIN"
// with a 400, so there is no way to create an admin through the app.
export const register = (input: Omit<RegisterInput, "role"> & { role: Exclude<Role, "ADMIN"> }) =>
  http<AuthSession>({ method: "post", url: "/auth/register", data: input });

// Idempotent — an unknown or already-revoked token still returns 200. Clear
// local state regardless of the outcome.
export const logout = (refreshToken: string) =>
  http<{ loggedOut: boolean }>({
    method: "post",
    url: "/auth/logout",
    data: { refreshToken },
  });

/** The session restore on app boot. */
export const getMe = () => http<User>({ method: "get", url: "/auth/me" });

/**
 * `email` and `role` are intentionally not editable. At least one field is
 * required, and `image_url: null` REMOVES the picture while omitting the key
 * leaves it alone — so the caller must distinguish untouched from cleared.
 */
export const updateMe = (input: { name?: string; image_url?: string | null }) =>
  http<User>({ method: "patch", url: "/auth/me", data: input });
