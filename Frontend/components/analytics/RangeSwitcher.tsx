"use client";

import { cn } from "@/lib/cn";
import type { RangeDays } from "@/lib/mutations/analyticsActions";

const OPTIONS: RangeDays[] = [7, 30, 90];

export function RangeSwitcher({
  value,
  onChange,
}: {
  value: RangeDays;
  onChange: (days: RangeDays) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex gap-1 rounded-full border border-line p-1"
    >
      {OPTIONS.map((days) => (
        <button
          key={days}
          type="button"
          aria-pressed={value === days}
          onClick={() => onChange(days)}
          className={cn(
            "focus-ring rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
            value === days ? "bg-ink-line text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {days}d
        </button>
      ))}
    </div>
  );
}
