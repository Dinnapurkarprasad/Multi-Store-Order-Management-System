"use client";

import { motion, useReducedMotion } from "motion/react";
import { Logotype } from "@/components/Logotype";
import { Badge } from "@/components/ui/Badge";
import type { OrderStatus } from "@/lib/types";

// Three drifting tickets (PRD §6). Same ±6px float the landing chips use, at
// 8–12s so no two ever line up.
const TICKETS: {
  id: string;
  line: string;
  total: string;
  status: OrderStatus;
  className: string;
  rotate: number;
  duration: number;
}[] = [
  {
    id: "#1042",
    line: "2× Masala Chai",
    total: "₹200.00",
    status: "PREPARING",
    className: "left-[8%] top-[14%]",
    rotate: -4,
    duration: 9,
  },
  {
    id: "#1039",
    line: "1× Paneer Roll",
    total: "₹120.00",
    status: "PLACED",
    className: "right-[10%] top-[40%]",
    rotate: 3,
    duration: 11.5,
  },
  {
    id: "#1031",
    line: "3× Butter Chicken",
    total: "₹1,047.00",
    status: "COMPLETED",
    className: "left-[16%] bottom-[16%]",
    rotate: -2,
    duration: 8.5,
  },
];

export function AuthAside() {
  const reduced = useReducedMotion();

  return (
    <section
      data-skin="ink"
      aria-hidden
      className="relative hidden overflow-hidden bg-surface p-10 lg:flex lg:flex-col lg:justify-between"
    >
      <Logotype href={null} />

      <div className="relative flex-1">
        {TICKETS.map(({ id, line, total, status, className, rotate, duration }) => (
          <motion.div
            key={id}
            className={`absolute w-[236px] ${className}`}
            style={{ rotate: `${rotate}deg` }}
            animate={reduced ? undefined : { y: [-6, 6, -6] }}
            transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="lifted rounded-ticket bg-card p-4">
              <div className="flex items-baseline justify-between font-mono text-sm text-fg">
                <span>{total}</span>
              </div>
              <p className="mt-1 text-sm text-fg-muted">{line}</p>
              <Badge status={status} className="mt-3" />
            </div>
          </motion.div>
        ))}
      </div>

      <p className="max-w-[24ch] font-display text-2xl font-bold leading-[0.95] tracking-[-0.035em] text-fg">
        Order from any shop. Watch it move.
      </p>
    </section>
  );
}
