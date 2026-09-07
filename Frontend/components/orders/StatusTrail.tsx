"use client";

import { cn } from "@/lib/cn";
import { STATUS } from "@/components/ui/Badge";
import type { OrderStatus } from "@/lib/types";

// Three dots joined by a rule, filled to the current status (PRD §6).
// PLACED → PREPARING → COMPLETED is the only legal path, so the trail is a
// straight line with no branches.
const STEPS: OrderStatus[] = ["PLACED", "PREPARING", "COMPLETED"];

export function StatusTrail({ status }: { status: OrderStatus }) {
  const reached = STEPS.indexOf(status);
  const { bg, fg } = STATUS[status];

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex flex-1 items-center">
        {/* The rule sits behind the dots. */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
        <div
          // Width animates on change, which is what goal 5's socket event will
          // drive — the transition lives here so the event handler stays dumb.
          className={cn(
            "absolute left-0 top-1/2 h-px -translate-y-1/2 transition-[width] duration-[400ms] ease-out",
            bg,
          )}
          style={{ width: `${(reached / (STEPS.length - 1)) * 100}%` }}
        />

        <div className="relative flex w-full justify-between">
          {STEPS.map((step, index) => (
            <span
              key={step}
              className={cn(
                "size-2.5 rounded-full transition-colors duration-200",
                index <= reached ? bg : "bg-line",
              )}
            />
          ))}
        </div>
      </div>

      <span className={cn("shrink-0 text-xs font-medium", fg)}>
        {STATUS[status].label}
      </span>
    </div>
  );
}
