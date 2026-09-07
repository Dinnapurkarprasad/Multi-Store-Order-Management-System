const STEPS = [
  { title: "Placed", body: "You send the order. The shop sees it appear instantly." },
  { title: "Preparing", body: "They start on it. Your status trail fills as it happens." },
  { title: "Ready", body: "Done and waiting. No refreshing, no guessing." },
];

/**
 * The ONLY place numbered markers are allowed anywhere in the app, because it's
 * the only thing that is actually a sequence (PRD §6).
 *
 * No animation here on purpose — a scroll-triggered reveal on every section is
 * the pattern §7 rules out.
 */
export function Sequence() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-14 md:px-8 md:py-20">
      <h2 className="font-display text-xl font-bold tracking-[-0.03em] text-fg sm:text-2xl">
        How an order moves
      </h2>

      <ol className="mt-8 grid gap-8 md:grid-cols-3">
        {STEPS.map(({ title, body }, index) => (
          <li key={title} className="flex flex-col gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-ink font-mono text-sm text-paper">
              {index + 1}
            </span>
            <h3 className="text-lg font-medium text-fg">{title}</h3>
            <p className="max-w-[36ch] text-sm text-fg-muted">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
