import type { Role } from "./types";

// Where each role goes after login/signup, and where a wrong-role visit to a
// guarded route gets redirected. Admins have no signup — they log in with the
// seeded credentials.
export const ROLE_HOME: Record<Role, string> = {
  USER: "/stores",
  STORE_OWNER: "/dashboard",
  ADMIN: "/admin",
};
