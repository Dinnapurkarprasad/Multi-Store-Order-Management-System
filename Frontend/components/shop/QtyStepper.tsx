"use client";

import { LuMinus, LuPlus } from "react-icons/lu";
import { cn } from "@/lib/cn";

// Icon-only is fine here: the ban is on icons alone in a *primary* button, and
// the one ember action on this screen is Place order. Both buttons carry an
// aria-label.
const button =
  "focus-ring inline-flex size-9 items-center justify-center rounded-full border border-line text-fg transition-colors duration-150 hover:bg-line disabled:opacity-40 disabled:pointer-events-none";

/** Replaces the `+` in place once qty > 0 (PRD §6). */
export function QtyStepper({
  qty,
  onChange,
  label,
  className,
}: {
  qty: number;
  onChange: (qty: number) => void;
  /** Item name, so screen readers get "Add Butter Chicken" not "Add". */
  label: string;
  className?: string;
}) {
  if (qty === 0) {
    return (
      <button
        type="button"
        aria-label={`Add ${label}`}
        onClick={() => onChange(1)}
        className={cn(button, className)}
      >
        <LuPlus className="size-4" />
      </button>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label={qty === 1 ? `Remove ${label}` : `One less ${label}`}
        onClick={() => onChange(qty - 1)}
        className={button}
      >
        <LuMinus className="size-4" />
      </button>
      <span
        aria-live="polite"
        className="min-w-8 text-center font-mono text-sm text-fg"
      >
        {qty}
      </span>
      <button
        type="button"
        aria-label={`One more ${label}`}
        // qty caps at 100 per item server-side.
        disabled={qty >= 100}
        onClick={() => onChange(qty + 1)}
        className={button}
      >
        <LuPlus className="size-4" />
      </button>
    </div>
  );
}
