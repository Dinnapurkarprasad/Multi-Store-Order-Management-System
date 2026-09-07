"use client";

import { useEffect, useState } from "react";
import { API_ORIGIN } from "@/lib/api/client";

// Free hosting sleeps when idle and the first request can take up to a minute
// (API.md gotcha 10). Without this the app just looks broken on a first visit.
//
// The overlay only appears if /ping hasn't answered in 3s, so a warm server
// shows nothing at all.
export function ColdStart() {
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaking(true), 3000);
    const controller = new AbortController();

    // /ping is outside /api and needs no auth. Bare fetch, not the api client
    // — this must not be queued behind a token refresh.
    fetch(`${API_ORIGIN}/ping`, { signal: controller.signal })
      .catch(() => {}) // a cold instance may fail once and work on retry
      .finally(() => {
        clearTimeout(timer);
        setWaking(false);
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (!waking) return null;

  return (
    <div
      role="status"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-surface px-6 text-center"
    >
      <p className="font-display text-2xl font-bold tracking-[-0.035em] text-fg">
        Waking the server
      </p>
      <p className="max-w-[42ch] text-sm text-fg-muted">
        Free hosting sleeps when idle. Up to a minute, first visit only.
      </p>
      {/* Ember progress bar, no spinner (PRD §4). Indeterminate — there is no
          real progress to report. */}
      <div className="mt-2 h-1 w-56 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-waking rounded-full bg-ember" />
      </div>
    </div>
  );
}
