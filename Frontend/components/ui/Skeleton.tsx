import { cn } from "@/lib/cn";

// Always give this the shape of the real thing it replaces — 6 store-card
// skeletons, charts at their exact final height (PRD §4, §6). A generic grey
// box that reflows on load is worse than no skeleton.
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-input bg-line", className)}
      {...props}
    />
  );
}
