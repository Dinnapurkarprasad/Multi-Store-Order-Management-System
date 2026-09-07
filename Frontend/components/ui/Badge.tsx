import { LuChefHat, LuCircleCheck, LuClock } from "react-icons/lu";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/lib/types";

// The fixed icon mapping from PRD §8, in one place because the ticket, the
// status trail and this badge all have to agree. There is no CANCELLED status
// in the API — don't add one.
export const STATUS = {
  PLACED: { label: "Placed", Icon: LuClock, fg: "text-placed", bg: "bg-placed" },
  PREPARING: {
    label: "Preparing",
    Icon: LuChefHat,
    fg: "text-preparing",
    bg: "bg-preparing",
  },
  COMPLETED: {
    label: "Completed",
    Icon: LuCircleCheck,
    fg: "text-completed",
    bg: "bg-completed",
  },
} as const satisfies Record<
  OrderStatus,
  { label: string; Icon: React.ComponentType<{ className?: string }>; fg: string; bg: string }
>;

// Status colour lands on the icon, never on the label. Amber and jade both fail
// text contrast on paper, and ember fails it on ink — so the word stays in
// --color-fg and the colour reads as an indicator beside it.
export function Badge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { label, Icon, fg } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-line px-2.5 py-1 text-xs font-medium text-fg",
        className,
      )}
    >
      <Icon className={cn("size-4 shrink-0", fg)} />
      {label}
    </span>
  );
}
