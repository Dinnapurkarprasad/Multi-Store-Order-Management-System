"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Logotype } from "@/components/Logotype";
import { useSession } from "@/components/RoleGuard";
import { ROLE_HOME } from "@/lib/roles";

export function PillNav() {
  const reduced = useReducedMotion();
  const session = useSession();

  return (
    <motion.nav
      initial={reduced ? false : { y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="fixed inset-x-0 top-4 z-40 flex justify-center px-5"
    >
      {/* A solid pill, not frosted glass — no glassmorphism (PRD §2). */}
      <div className="flex w-full max-w-[560px] items-center justify-between gap-4 rounded-full border border-line bg-card px-5 py-2.5">
        <Logotype href="/" />

        {/* Already signed in? Asking someone to sign in again is a wart. */}
        {session.state === "authed" ? (
          <Link
            href={ROLE_HOME[session.user.role]}
            className="focus-ring rounded-full px-3 py-1.5 text-sm font-medium text-fg"
          >
            Open Counter →
          </Link>
        ) : (
          <div className="flex items-center gap-1">
            <Link
              href="/login"
              className="focus-ring rounded-full px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="focus-ring rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </motion.nav>
  );
}
