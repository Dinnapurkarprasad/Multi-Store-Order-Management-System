"use client";

import { DialogShell } from "./DialogShell";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

/** Confirm dialog. For a form in a dialog, use DialogShell directly. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  pending,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  pending?: boolean;
  className?: string;
}) {
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      className={cn(
        "m-auto w-[calc(100vw-2.5rem)] max-w-[420px] rounded-card p-6",
        className,
      )}
    >
      <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
        {title}
      </h2>
      {description && (
        <div className="mt-2 text-sm text-fg-muted">{description}</div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        {onConfirm && (
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        )}
      </div>
    </DialogShell>
  );
}
