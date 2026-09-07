import Link from "next/link";
import { cn } from "@/lib/cn";

// The one place the wordmark is drawn. No gradient text, no coloured word —
// the ember mark carries the brand and the word stays in --color-fg.
export function Logotype({
  className,
  href = "/",
}: {
  className?: string;
  href?: string | null;
}) {
  const mark = (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display text-lg font-bold tracking-[-0.035em] text-fg",
        className,
      )}
    >
      <span className="size-2.5 rounded-full bg-ember" aria-hidden />
      Counter
    </span>
  );

  return href ? (
    <Link href={href} className="focus-ring rounded-full">
      {mark}
    </Link>
  ) : (
    mark
  );
}
