"use client";

import { motion, useReducedMotion } from "motion/react";
import { STATUS } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { money } from "@/lib/money";
import { relativeTime } from "@/lib/time";
import type { Order, OrderStatus } from "@/lib/types";

// Derived from the status, never hardcoded — a COMPLETED ticket has no action,
// and the server rejects anything but PLACED → PREPARING → COMPLETED.
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PLACED: { status: "PREPARING", label: "Start preparing" },
  PREPARING: { status: "COMPLETED", label: "Mark completed" },
};

export function OrderTicket({
  order,
  isNew,
  onAdvance,
  pending,
}: {
  order: Order;
  /** Arrived while the rail was open — earns one ember bloom. */
  isNew: boolean;
  onAdvance: (next: OrderStatus) => void;
  pending: boolean;
}) {
  const reduced = useReducedMotion();
  const next = NEXT[order.status];
  const { bg } = STATUS[order.status];

  return (
    <motion.div
      // layoutId makes the ticket travel between columns when its status
      // changes, instead of vanishing here and appearing there.
      layoutId={order.id}
      layout
      initial={reduced ? false : { opacity: 0, y: -8 }}
      animate={{
        opacity: 1,
        y: 0,
        // One ember bloom, decaying — only for tickets that just arrived.
        boxShadow: isNew && !reduced
          ? [
              "0 8px 24px -8px rgba(236,91,56,.55)",
              "0 8px 24px -8px rgba(236,91,56,0)",
            ]
          : "0 8px 24px -8px rgba(236,91,56,0)",
      }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 30,
        boxShadow: { duration: reduced ? 0 : 0.6 },
      }}
      className="lifted rounded-ticket bg-card"
    >
      {/* 3px status bar down the left edge. */}
      <div className="flex">
        <span className={`w-[3px] shrink-0 rounded-l-ticket ${bg}`} aria-hidden />

        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-sm text-fg">
              #{order.id.slice(0, 6)}
            </span>
            <span className="shrink-0 text-xs text-fg-muted">
              {relativeTime(order.created_at)}
            </span>
          </div>

          <ul className="mt-2 flex flex-col gap-0.5">
            {order.items.map((line) => (
              <li key={line.item_id} className="truncate text-sm text-fg-muted">
                {line.qty}× {line.name}
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-mono text-sm text-fg">
              {money(order.total_amount)}
            </span>
            {next && (
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => onAdvance(next.status)}
              >
                {next.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
