"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import { LuReceipt } from "react-icons/lu";
import { Onboarding } from "@/components/owner/Onboarding";
import { OrderTicket } from "@/components/owner/OrderTicket";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdvanceOrder, useSelectedStore, useStoreOrders } from "@/lib/mutations/ownerActions";
import type { Order, OrderStatus } from "@/lib/types";

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "PLACED", title: "Placed" },
  { status: "PREPARING", title: "Preparing" },
  { status: "COMPLETED", title: "Completed" },
];

function Rail({ storeId }: { storeId: string }) {
  const { data, isPending, isError, refetch } = useStoreOrders(storeId);
  const advance = useAdvanceOrder();

  const orders = data?.data ?? [];

  // Which tickets have been on screen already. Anything not in here arrived
  // just now — from the socket or a refetch — and earns the bloom. Without
  // this, the first load would bloom every ticket at once.
  const seen = useRef<Set<string>>(new Set());
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current && orders.length > 0) firstRender.current = false;
    const timer = setTimeout(() => {
      for (const order of orders) seen.current.add(order.id);
    }, 700); // after the bloom has decayed
    return () => clearTimeout(timer);
  }, [orders]);

  const isNew = (order: Order) =>
    !firstRender.current && !seen.current.has(order.id);

  if (isPending) {
    return (
      <div className="grid h-full grid-cols-1 gap-4 overflow-hidden p-5 lg:grid-cols-3 md:p-8">
        {COLUMNS.map(({ status }) => (
          <div key={status} className="flex flex-col gap-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-32 rounded-ticket" />
            <Skeleton className="h-32 rounded-ticket" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={LuReceipt}
        title="Couldn't load the queue."
        description="The server didn't answer. It may still be waking up."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }

  return (
    // Mobile: one column at a time, swiped. CSS scroll-snap does this natively
    // — no gesture handling, and it keeps working with a trackpad or keyboard.
    <div className="flex h-full snap-x snap-mandatory overflow-x-auto lg:grid lg:grid-cols-3 lg:overflow-x-hidden">
      {COLUMNS.map(({ status, title }) => {
        const inColumn = orders.filter((order) => order.status === status);

        return (
          <section
            key={status}
            className="flex h-full w-full shrink-0 snap-center flex-col border-r border-line last:border-r-0 lg:w-auto lg:shrink"
          >
            <header className="flex shrink-0 items-baseline gap-2 px-5 py-4">
              <h2 className="text-sm font-semibold text-fg">{title}</h2>
              <span className="font-mono text-xs text-fg-muted">
                {inColumn.length}
              </span>
            </header>

            {/* Only this pane scrolls. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
              {inColumn.length === 0 ? (
                // Dashed outline keeps the column's shape, so the layout
                // doesn't jump when the first order lands.
                <div className="flex h-32 items-center justify-center rounded-ticket border border-dashed border-line">
                  <span className="text-sm text-fg-muted">Nothing here</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {inColumn.map((order) => (
                      <OrderTicket
                        key={order.id}
                        order={order}
                        isNew={isNew(order)}
                        pending={
                          advance.isPending && advance.variables?.id === order.id
                        }
                        onAdvance={(next) =>
                          advance.mutate({ id: order.id, status: next })
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { store, stores, isPending, isError, refetch } = useSelectedStore();

  if (isPending) {
    return <Skeleton className="m-5 h-64 rounded-card md:m-8" />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={LuReceipt}
        title="Couldn't load your stores."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }

  // No stores yet → the whole console becomes onboarding.
  if (stores.length === 0 || !store) {
    return (
      <div className="h-full overflow-y-auto">
        <Onboarding />
      </div>
    );
  }

  return <Rail storeId={store.id} />;
}
