"use client";

import Link from "next/link";
import { LuShoppingBag, LuStore } from "react-icons/lu";
import { buttonClass } from "@/components/ui/Button";

const PATHS = [
  {
    skin: "paper" as const,
    Icon: LuShoppingBag,
    eyebrow: "For shoppers",
    title: "I want to order",
    points: [
      "Browse every shop in one place",
      "One order, one shop, no confusion",
      "Follow it from placed to ready, live",
    ],
    href: "/signup",
    cta: "Create an account",
  },
  {
    skin: "ink" as const,
    Icon: LuStore,
    eyebrow: "For store owners",
    title: "I run a store",
    points: [
      "A live rail built like a kitchen display",
      "One tap to advance an order",
      "Your menu, prices and pictures",
    ],
    href: "/signup?as=owner",
    cta: "Open your storefront",
  },
];

/**
 * Two cards, one per role. Each carries its own skin, so the card you pick is
 * literally the surface you'll get — paper for browsing, ink for working.
 *
 * Both CTAs are secondary; the hero keeps the page's only ember action.
 */
export function RolePaths() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-6 md:px-8 md:py-10">
      <div className="grid gap-5 md:grid-cols-2">
        {PATHS.map(({ skin, Icon, eyebrow, title, points, href, cta }) => (
          <div
            key={title}
            data-skin={skin}
            // `lifted` only paints on the ink card, which is the point — it's
            // what makes the dark surface read as raised.
            className="lifted flex flex-col rounded-card border border-line bg-card p-6 transition-transform duration-200 hover:-translate-y-0.5 md:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ember-haze">
                <Icon className="size-5 text-accent" />
              </span>
              <span className="text-sm text-fg-muted">{eyebrow}</span>
            </div>

            <h2 className="mt-5 font-display text-xl font-bold tracking-[-0.03em] text-fg sm:text-2xl">
              {title}
            </h2>

            <ul className="mt-5 flex flex-1 flex-col gap-2.5">
              {points.map((point) => (
                <li key={point} className="flex gap-3 text-sm text-fg-muted">
                  {/* A plain dot — the check icon is reserved for COMPLETED. */}
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-fg-muted" />
                  {point}
                </li>
              ))}
            </ul>

            <Link
              href={href}
              className={buttonClass({
                variant: "secondary",
                className: "mt-7 self-start",
              })}
            >
              {cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
