"use client";

// React Query hooks for the auth actions — the layer that ties a request to the
// cache, to token storage, and to a toast.
//
// Three files, three jobs, deliberately not merged:
//   store/auth.ts    the tokens themselves (Zustand, persisted)
//   lib/api/auth.ts  the HTTP calls, React-free so anything can call them
//   this file        the hooks that combine those two
//
// Screens import from here. Calling lib/api/auth.ts directly would let a login
// succeed without the session ever being stored.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as authApi from "../api/auth";
import { keys } from "../queryKeys";
import { notify } from "../toast";
import type { AuthSession, User } from "../types";
import { useAuth } from "@/store/auth";

export type { LoginInput, RegisterInput } from "../api/auth";

/** Shared by login and signup — both return the same body.
 *
 *  No error toast here on purpose: these two forms show a banner plus field
 *  errors, and a toast would repeat it. */
function useAuthMutation<TInput>(
  mutationFn: (input: TInput) => Promise<AuthSession>,
  welcome: (session: AuthSession) => string,
) {
  const queryClient = useQueryClient();
  const setSession = useAuth((s) => s.setSession);

  return useMutation({
    mutationFn,
    onSuccess: (session) => {
      setSession(session);
      // Seed the cache so the guard doesn't fire a GET /auth/me it already
      // knows the answer to.
      queryClient.setQueryData<User>(keys.me, session.user);
      notify.success(welcome(session));
    },
  });
}

export const useLogin = () =>
  useAuthMutation(authApi.login, ({ user }) => `Signed in as ${user.name}`);

export const useRegister = () =>
  useAuthMutation(authApi.register, ({ user }) =>
    user.role === "STORE_OWNER"
      ? "Storefront account created"
      : `Welcome, ${user.name}`,
  );

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = useAuth.getState().refreshToken;
      // Idempotent server-side, and a failure here doesn't change what we do
      // locally — the tokens go either way.
      if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    },
    onSettled: () => {
      useAuth.getState().clear();
      queryClient.clear();
      notify.success("Signed out");
    },
  });
}

/** PATCH /auth/me — the only place a user's avatar comes from, so the nav has
 *  something to show. */
export function useUpdateMe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (user) => {
      useAuth.getState().setUser(user);
      queryClient.setQueryData<User>(keys.me, user);
      notify.success("Profile updated");
    },
    onError: (error) => notify.error(error),
  });
}
