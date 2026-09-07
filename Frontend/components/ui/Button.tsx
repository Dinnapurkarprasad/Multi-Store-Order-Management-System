import { cn } from "@/lib/cn";

// One ember action per screen (PRD §2) — that is a discipline the screens keep,
// not something this component can enforce. If you reach for a second
// `primary` on one screen, one of the two is wrong.
type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ember text-white bloom hover:bg-ember-lift hover:bloom-wide active:bg-ember",
  secondary: "border border-line text-fg hover:bg-line",
  ghost: "text-fg hover:bg-line",
};

const SIZES = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-base gap-2",
};

/**
 * The same classes, for a <Link> that should look like a button — a CTA that
 * navigates is an anchor, not a button, and this beats an asChild/cloneElement
 * dance to get there.
 */
export const buttonClass = ({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
} = {}) =>
  cn(
    // Pill radius for buttons (PRD §2).
    "focus-ring inline-flex items-center justify-center rounded-full font-medium",
    "transition-all duration-150 disabled:pointer-events-none disabled:opacity-50",
    SIZES[size],
    VARIANTS[variant],
    className,
  );

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: Variant;
  size?: keyof typeof SIZES;
}) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}
