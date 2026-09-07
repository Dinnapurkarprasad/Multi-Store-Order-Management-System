"use client";

import { useState } from "react";
import { LuArchive } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useArchiveOldOrders } from "@/lib/mutations/adminActions";

/**
 * How a reviewer sees the archival task without Postman, so it's treated as a
 * demo surface (PRD §6): the confirm dialog spells out exactly what will
 * happen, and the result is stated afterwards.
 */
export default function ArchivePage() {
  const archive = useArchiveOldOrders();
  const [days, setDays] = useState("30");
  const [confirming, setConfirming] = useState(false);

  const parsed = Number(days);
  const daysError =
    days !== "" && (!Number.isInteger(parsed) || parsed < 1 || parsed > 3650)
      ? "A whole number of days between 1 and 3650"
      : undefined;
  const valid = days !== "" && !daysError;

  return (
    <div className="mx-auto max-w-[640px] px-5 py-10 md:px-8">
      <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl text-fg">
        Archive
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        Moves old orders out of the live table, in batches, one transaction each.
      </p>

      <Card className="mt-6 p-6">
        <div className="flex items-start gap-3">
          <LuArchive className="mt-0.5 size-5 shrink-0 text-fg-muted" />
          <div className="min-w-0 flex-1">
            <Input
              label="Archive orders older than"
              inputMode="numeric"
              value={days}
              onChange={(event) => setDays(event.target.value)}
              error={daysError}
              hint="Days. Safe to run twice — a second run archives nothing."
              className="max-w-[160px]"
            />

            {/* The one real warning on this screen: seeded data spans 90 days,
                so the default of 30 empties two thirds of every order screen.
                Better said here than discovered after the fact. */}
            <p className="mt-4 rounded-input border border-preparing bg-card px-3.5 py-3 text-sm text-fg-muted">
              The demo data spans 90 days. Archiving at 30 days moves roughly two
              thirds of it out of the order lists — worth saving until you&apos;re
              done showing the other screens.
            </p>

            <Button
              variant="primary"
              disabled={!valid || archive.isPending}
              onClick={() => setConfirming(true)}
              className="mt-5"
            >
              {archive.isPending ? "Archiving…" : "Archive old orders"}
            </Button>
          </div>
        </div>
      </Card>

      {/* The result, stated plainly, and it stays on screen. */}
      {archive.data && (
        <Card className="mt-4 p-5">
          <p className="text-base text-fg">
            Archived{" "}
            <span className="font-mono">{archive.data.archived}</span>{" "}
            {archive.data.archived === 1 ? "order" : "orders"} in{" "}
            <span className="font-mono">{archive.data.batches}</span>{" "}
            {archive.data.batches === 1 ? "batch" : "batches"}.
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            Took {archive.data.durationMs} ms. Analytics totals are unchanged —
            those read views that union the live and archived tables.
          </p>
        </Card>
      )}

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Archive orders older than ${parsed} days?`}
        description={
          <>
            Moves orders older than {parsed} days, with their line items, into
            the archive tables. They disappear from every order list.{" "}
            <strong className="font-medium text-fg">
              Analytics totals stay the same.
            </strong>
          </>
        }
        confirmLabel="Archive them"
        pending={archive.isPending}
        onConfirm={() =>
          archive.mutate(
            { days: parsed },
            { onSettled: () => setConfirming(false) },
          )
        }
      />
    </div>
  );
}
