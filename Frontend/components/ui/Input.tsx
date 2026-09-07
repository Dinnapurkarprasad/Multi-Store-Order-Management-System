"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

// `error` takes the string straight out of `error.details.fieldErrors[name]`
// (API.md §1), so auth and menu forms map server validation onto fields with no
// translation step.
export function Input({
  label,
  error,
  hint,
  className,
  id,
  type = "text",
  ...props
}: React.ComponentProps<"input"> & {
  label?: string;
  error?: string;
  /** Shown under the field until an error replaces it. */
  hint?: string;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  // Any type="password" field gets a reveal toggle, so no form has to remember
  // to add one.
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "focus-ring h-11 w-full rounded-input border bg-card px-3.5 text-base text-fg",
            "placeholder:text-fg-muted transition-colors duration-150",
            isPassword && "pr-16",
            error ? "border-ember" : "border-line",
            className,
          )}
          {...props}
        />

        {/* A word, not an eye icon — PRD §8 fixes the icon set and has no eye
            in it, and "Show" is clearer than a glyph anyway. */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-pressed={revealed}
            aria-controls={inputId}
            className="focus-ring absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full px-2.5 py-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {/* The field grows instead of reserving a slot — a fixed-height error row
          leaves a gap under every valid field on the form. */}
      {error ? (
        <p id={errorId} className="text-sm text-accent">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-sm text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
