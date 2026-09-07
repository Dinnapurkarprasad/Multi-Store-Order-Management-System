"use client";

import { LuWifi, LuWifiOff } from "react-icons/lu";
import { useConnection } from "@/store/connection";

/**
 * The only always-visible status chrome in the app (PRD §5). Lives in the
 * console header — a shopper doesn't need to think about sockets.
 */
export function ConnectionBadge() {
  const status = useConnection((s) => s.status);
  if (status === "idle") return null;

  const connected = status === "connected";

  return (
    <span
      className="inline-flex items-center gap-2 text-xs font-medium text-fg-muted"
      role="status"
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${connected ? "bg-completed" : "animate-pulse bg-preparing"}`}
      />
      {connected ? (
        <LuWifi className="size-4 text-completed" />
      ) : (
        <LuWifiOff className="size-4 text-preparing" />
      )}
      {/* Silent when all is well — a permanent "Connected" label is noise. */}
      {!connected && "Reconnecting"}
      <span className="sr-only">{connected ? "Live updates connected" : ""}</span>
    </span>
  );
}
