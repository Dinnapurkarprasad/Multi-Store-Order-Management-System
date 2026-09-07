"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IconContext } from "react-icons";
import { Toaster } from "sonner";
import { ColdStart } from "@/components/ColdStart";
import { ApiError } from "@/lib/api/client";
import { useOrderSocket } from "@/lib/socket";


function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Never retry a 4xx — a 401, 403, 404 or a validation error will say
        // the same thing three times and just delay the error state. Network
        // failures (status 0) and 5xx do get retried: the backend is on free
        // hosting and the first request after idle can fail once.
        retry: (count, error) =>
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
            ? false
            : count < 3,
      },
    },
  });
}

/** Hooks can't be called beside a provider they depend on, so the socket gets
 *  a component of its own inside the tree. Renders nothing. */
function OrderSocket() {
  useOrderSocket();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // useState, not a module-level client: on the server one client per request,
  // on the client one that survives re-renders but not a full reload.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {/* react-icons bakes strokeWidth into each icon's own attributes, so a
          context `attr` loses to it. A class does win, and scoping the rule to
          .ui-icon keeps it off recharts' SVGs (PRD §8). */}
      <IconContext.Provider value={{ className: "ui-icon" }}>
        <ColdStart />
        {/* Must sit inside QueryClientProvider — it patches the order caches. */}
        <OrderSocket />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className:
              "!rounded-input !border-line !bg-card !text-fg !font-sans !text-sm",
          }}
        />
      </IconContext.Provider>
    </QueryClientProvider>
  );
}
