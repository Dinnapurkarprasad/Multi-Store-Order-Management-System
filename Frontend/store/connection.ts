"use client";

import { create } from "zustand";

// Read by <ConnectionBadge/>, written by useOrderSocket. Not persisted — it
// describes right now.
export type ConnectionStatus = "idle" | "connected" | "reconnecting";

export const useConnection = create<{
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}>()((set) => ({
  status: "idle",
  setStatus: (status) => set({ status }),
}));
