"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Native <dialog> plus the open/close wiring. Esc, focus trapping, top-layer
 * stacking and ::backdrop all come free — a portal with a hand-rolled focus
 * trap would be far more code to land in the same place.
 *
 * Used by the confirm Dialog, the mobile cart sheet and the item form, which is
 * why the wiring lives here rather than three times over.
 */
export function DialogShell({
  open,
  onClose,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // showModal() throws if already open; close() is a no-op if it isn't.
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Fires for Esc and form-dismiss too, so parent state stays in sync
      // however the dialog was closed.
      onClose={onClose}
      // The dialog element fills the backdrop area; a click lands on it only
      // when it missed the inner panel.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn("bg-card text-fg", className)}
    >
      {children}
    </dialog>
  );
}
