"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Which store the console is looking at. Owners can have several, and this
// drives both the orders query and the analytics calls — so it's persisted,
// or a refresh would silently switch which store you're running.
export const useConsole = create<{
  storeId: string | null;
  setStoreId: (id: string) => void;
}>()(
  persist(
    (set) => ({
      storeId: null,
      setStoreId: (storeId) => set({ storeId }),
    }),
    { name: "counter.console" },
  ),
);
