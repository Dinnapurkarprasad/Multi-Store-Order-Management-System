"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { buttonClass } from "@/components/ui/Button";
import { STAGGER } from "./timing";

/**
 * Each line masks up from its own clipped row.
 *
 * The vertical padding is load-bearing: the ink pill on line two is taller than
 * its line box, and without room here `overflow-hidden` sliced the top and
 * bottom off it. `-my-*` pulls the outer spacing back so the lines still sit
 * tight together.
 */
function HeadlineLine({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  const reduced = useReducedMotion();

  return (
    <span className="-my-1.5 block overflow-hidden py-1.5 sm:-my-2 sm:py-2">
      <motion.span
        initial={reduced ? false : { y: "110%" }}
        animate={{ y: 0 }}
        transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const reduced = useReducedMotion();

  return (
    // The hero wash and the 64px grid live here, and nowhere else in the app.
    <section className="hero-wash relative">
      {/* pointer-events-none, or the decorative overlay eats clicks. */}
      <div
        className="landing-grid pointer-events-none absolute inset-0"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1280px] px-5 pb-14 pt-32 text-center md:px-8 md:pt-44">
        {/* 34 → 48 → 68. The 68px display size is desktop-only; unqualified it
            overflowed a 375px screen. */}
        <h1 className="mx-auto max-w-[20ch] font-display text-2xl font-bold tracking-[-0.035em] text-fg sm:text-3xl lg:text-4xl">
          <HeadlineLine delay={0.15}>Order from any shop.</HeadlineLine>
          <HeadlineLine delay={0.15 + STAGGER * 2}>
            <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              Watch it move
              {/* The capsule is a filled ink pill. Its own leading keeps the
                  text optically centred inside it. */}
              <span className="inline-block rounded-full bg-ink px-4 py-1.5 leading-[1.1] text-paper sm:px-5">
                in real time
              </span>
            </span>
          </HeadlineLine>
        </h1>

        <motion.p
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + STAGGER * 5, duration: 0.4 }}
          className="mx-auto mt-6 max-w-[46ch] text-base text-fg-muted"
        >
          Browse local stores, place an order, and follow it from placed to
          ready.
        </motion.p>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + STAGGER * 7, duration: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          {/* The one ember action on the page. RolePaths uses secondary buttons
              so this stays the only one (PRD §2). */}
          <Link href="/signup" className={buttonClass({ variant: "primary" })}>
            Start ordering
          </Link>
          <Link
            href="/signup?as=owner"
            className="focus-ring rounded-full px-2 py-1 text-sm font-medium text-fg transition-colors duration-150 hover:text-accent"
          >
            Open a store →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
