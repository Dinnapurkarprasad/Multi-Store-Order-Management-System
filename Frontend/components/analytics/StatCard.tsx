"use client";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  note,
  loading,
}: {
  label: string;
  value: string;
  /** Where the number comes from, when that isn't obvious. */
  note?: string;
  loading?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-fg-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-24" />
      ) : (
        // Mono so four cards in a row align on their digits.
        <p className={cn("mt-2 font-mono text-2xl text-fg")}>{value}</p>
      )}
      {note && <p className="mt-1 text-xs text-fg-muted">{note}</p>}
    </Card>
  );
}
