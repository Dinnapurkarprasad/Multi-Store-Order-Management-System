import { cn } from "@/lib/cn";

// `lifted` is a no-op on paper — the rule is scoped to [data-skin="ink"] in
// globals.css, so this component never has to know which skin it is under.
export function Card({
  className,
  ...props
}: React.ComponentProps<"div"> & { className?: string }) {
  return (
    <div
      className={cn("lifted rounded-card bg-card", className)}
      {...props}
    />
  );
}
