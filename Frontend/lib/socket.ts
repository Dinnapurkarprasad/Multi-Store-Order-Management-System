"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { refreshAccessToken } from "./api/client";
import { patchOrder, prependOrder } from "./orderCache";
import { notify } from "./toast";
import type { Order, OrderStatusEvent } from "./types";
import { useAuth } from "@/store/auth";
import { useConnection } from "@/store/connection";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL!;

/**
 * One socket, created after auth and destroyed on logout. Mounted once, in
 * Providers.
 *
 * HTTP stays the source of truth — every screen already works through
 * refetch-after-mutation, and this only tells it something changed sooner than
 * a poll would. Turn the socket off and nothing breaks.
 *
 * Rooms are joined server-side from the JWT (user:{id}, store:{id} per owned
 * store, admin), so there is nothing to subscribe to from here and no way to
 * listen to someone else's store.
 */
export function useOrderSocket() {
  const queryClient = useQueryClient();
  const accessToken = useAuth((s) => s.accessToken);
  const role = useAuth((s) => s.user?.role);
  const setStatus = useConnection((s) => s.setStatus);

  // Events fired while disconnected are gone — they aren't queued. So every
  // reconnect refetches once. The first connect doesn't need it: the queries
  // are loading anyway.
  const connectedBefore = useRef(false);

  useEffect(() => {
    if (!accessToken) {
      setStatus("idle");
      return;
    }

    const socket: Socket = io(SOCKET_URL, {
      // The ACCESS token, not the refresh token — verified during the handshake.
      auth: { token: accessToken },
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      setStatus("connected");
      if (connectedBefore.current) {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }
      connectedBefore.current = true;
    });

    socket.on("disconnect", () => setStatus("reconnecting"));

    socket.on("connect_error", async (error: Error) => {
      setStatus("reconnecting");

      // The handshake re-runs on every reconnect, so a token older than 15
      // minutes fails here. Refresh through the shared single-flight and
      // reconnect with the new one.
      if (error.message === "UNAUTHORIZED") {
        try {
          const fresh = await refreshAccessToken();
          socket.auth = { token: fresh };
          socket.connect();
        } catch {
          // The refresh itself failed — the api client has already cleared the
          // session and redirected. Nothing to do here.
        }
      }
    });

    // Full order object, identical to the POST /orders response.
    socket.on("order:created", (order: Order) => {
      prependOrder(queryClient, order);

      // Toast on the owner console only — the shopper who placed it is already
      // looking at their own confirmation.
      if (role === "STORE_OWNER" || role === "ADMIN") {
        notify.message(`New order · ${order.store_name}`, `${order.items.length} items`);
      }
    });

    // SLIM payload — no `items`. Patch by id; never replace the cached object.
    socket.on("order:status_updated", (event: OrderStatusEvent) => {
      patchOrder(queryClient, event.id, {
        status: event.status,
        updated_at: event.updated_at,
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      connectedBefore.current = false;
      setStatus("idle");
    };
    // Re-running on a token change would tear down and rebuild the socket every
    // 15 minutes. The connect_error handler above already swaps the token in
    // place, so this only cares about going from signed-out to signed-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(accessToken), role, queryClient, setStatus]);
}
