"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { keys } from "@/lib/queryKeys";
import { ROLE_HOME } from "@/lib/roles";
import type { Role, User } from "@/lib/types";
import { useAuth, useAuthHydrated } from "@/store/auth";
import { Skeleton } from "@/components/ui/Skeleton";

/** GET /auth/me — the session restore. Enabled only once there's a token to
 *  send, so anonymous visitors don't fire a doomed request. */
export function useMe() {
  const accessToken = useAuth((s) => s.accessToken);
  const hydrated = useAuthHydrated();

  return useQuery({
    queryKey: keys.me,
    queryFn: getMe,
    enabled: hydrated && Boolean(accessToken),
    initialData: useAuth.getState().user ?? undefined,
  });
}

type Session =
  | { state: "restoring" }
  | { state: "anon" }
  | { state: "authed"; user: User };

export function useSession(): Session {
  const hydrated = useAuthHydrated();
  const accessToken = useAuth((s) => s.accessToken);
  const { data, isPending } = useMe();

  // localStorage hasn't been read yet — we genuinely don't know who this is.
  if (!hydrated) return { state: "restoring" };
  if (!accessToken) return { state: "anon" };
  if (!data) return isPending ? { state: "restoring" } : { state: "anon" };
  return { state: "authed", user: data };
}

/**
 * Guards a route by role. While the session restores this renders `fallback`,
 * never a redirect — a redirect here means a refresh on /dashboard bounces the
 * owner to the landing page (PRD §3).
 */
export function RoleGuard({
  allow,
  children,
  fallback,
}: {
  allow: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const session = useSession();

  const allowed = session.state === "authed" && allow.includes(session.user.role);

  useEffect(() => {
    if (session.state === "restoring") return;
    if (session.state === "anon") {
      router.replace("/login");
      return;
    }
    // Right person, wrong door — send them to their own home rather than to
    // login, which would look like being signed out.
    if (!allow.includes(session.user.role)) {
      router.replace(ROLE_HOME[session.user.role]);
    }
  }, [session, allow, router]);

  if (allowed) return children;

  return (
    fallback ?? (
      <div className="flex flex-col gap-4 px-5 py-12 md:px-8">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    )
  );
}
