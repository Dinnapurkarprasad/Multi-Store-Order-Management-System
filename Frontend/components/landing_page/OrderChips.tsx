"use client";

import { motion, useReducedMotion } from "motion/react";
import { STAGGER } from "./timing";

const CHIPS = [
  { text: "2× Masala Chai", meta: "Preparing", tint: "bg-preparing", rotate: -3, float: 9 },
  { text: "#1042", meta: "Ready", tint: "bg-completed", rotate: 2, float: 11.5 },
  { text: "Sunrise Cafe", meta: "3 new", tint: "bg-placed", rotate: -1.5, float: 8.5 },
];

export function OrderChips() {
  const reduced = useReducedMotion();

  return (
    <section
      aria-hidden
      className="mx-auto -mt-2 flex max-w-[1280px] flex-wrap items-center justify-center gap-x-2 gap-y-3 px-5 pb-14 md:px-8 md:pb-16"
    >
      {CHIPS.map(({ text, meta, tint, rotate, float }, index) => (
        <motion.div
          key={text}
          initial={reduced ? false : { opacity: 0, scale: 0.9 }}
          animate={
            reduced
              ? { opacity: 1, scale: 1 }
              : { opacity: 1, scale: 1, y: [-6, 6, -6] }
          }
          transition={{
            opacity: { delay: 0.5 + index * STAGGER, duration: 0.3 },
            scale: { delay: 0.5 + index * STAGGER, duration: 0.3 },
            // Continuous ±6px float, 8–12s. Landing only — the status trail is
            // where realtime motion earns its keep.
            y: {
              duration: float,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.8,
            },
          }}
          style={{ rotate: `${rotate}deg` }}
          // Overlapping from sm up, so they read as a scattered pile of
          // tickets. On a phone they just wrap — negative margins plus rotation
          // pushed them past the viewport edge.
          className="flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 sm:-mx-2 sm:gap-2.5 sm:px-4 sm:py-2.5"
        >
          <span className={`size-1.5 shrink-0 rounded-full ${tint}`} />
          <span className="font-mono text-xs text-fg sm:text-sm">{text}</span>
          <span className="text-xs text-fg-muted sm:text-sm">· {meta}</span>
        </motion.div>
      ))}
    </section>
  );
}
