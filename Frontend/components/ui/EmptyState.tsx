import { Button } from "./Button";
import { cn } from "@/lib/cn";

// Covers empty AND error, because they are the same layout with different copy
// and the error just happens to have a `Try again` action (PRD §9). One
// component means no list can ship one state and forget the other.
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon && <Icon className="size-6 text-fg-muted" />}
      <p className="text-base font-medium text-fg">{title}</p>
      {description && (
        <p className="max-w-[42ch] text-sm text-fg-muted">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
