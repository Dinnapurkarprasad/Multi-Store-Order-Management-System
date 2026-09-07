"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession, User } from "@/lib/types";

// Tokens live here and in localStorage. The API is on another origin and sets
// no cookies (API.md §2), so storing them client-side is the sanctioned model,
// not a shortcut.
//
// This store deliberately imports nothing from lib/api.ts — the API client
// reads this store, so a dependency the other way would be a cycle.
type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: AuthSession) => void;
  setUser: (user: User) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      // Called on login, on signup, and after every refresh. Refresh tokens
      // rotate, so this always overwrites BOTH tokens — keeping a stale one
      // would trip reuse detection and kill every session.
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: "counter.auth" },
  ),
);

// True once localStorage has been read back. Until then a guard must render a
// skeleton rather than a redirect — otherwise refreshing /dashboard bounces the
// owner to the landing page (PRD §3).
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuth.persist.hasHydrated()) setHydrated(true);
    return useAuth.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
