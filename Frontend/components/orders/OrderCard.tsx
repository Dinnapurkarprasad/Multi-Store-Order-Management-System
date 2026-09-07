"use client";

import { StatusTrail } from "./StatusTrail";
import { Card } from "@/components/ui/Card";
import { money } from "@/lib/money";
import { relativeTime } from "@/lib/time";
import type { Order } from "@/lib/types";

export function OrderCard({ order }: { order: Order }) {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-lg font-bold tracking-[-0.02em] text-fg">
          {/* store_name is joined into the response — no extra lookup. */}
          {order.store_name}
        </p>
        <span className="shrink-0 text-xs text-fg-muted">
          {relativeTime(order.created_at)}
        </span>
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        {order.items.map((line) => (
          <li
            key={line.item_id}
            className="flex justify-between gap-3 text-sm text-fg-muted"
          >
            <span className="truncate">
              {line.qty}× {line.name}
            </span>
            <span className="shrink-0 font-mono">{money(line.line_total)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm font-medium text-fg">Total</span>
        <span className="font-mono text-base text-fg">
          {money(order.total_amount)}
        </span>
      </div>

      <div className="mt-4">
        <StatusTrail status={order.status} />
      </div>
    </Card>
  );
}
