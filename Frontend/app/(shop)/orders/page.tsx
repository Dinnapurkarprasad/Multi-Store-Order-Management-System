"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuReceipt } from "react-icons/lu";
import { OrderCard } from "@/components/orders/OrderCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { useMyOrders } from "@/lib/mutations/shopperActions";
import type { Order, OrderStatus } from "@/lib/types";

// There is no cancelled status in the API — don't build that tab (PRD §6).
const TABS = {
  Active: ["PLACED", "PREPARING"] as OrderStatus[],
  Completed: ["COMPLETED"] as OrderStatus[],
  All: null,
} as const;

type TabName = keyof typeof TABS;

export default function OrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabName>("Active");

  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyOrders();

  const all: Order[] = data?.pages.flatMap((page) => page.data) ?? [];
  const wanted = TABS[tab];
  const orders = wanted ? all.filter((order) => wanted.includes(order.status)) : all;

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
      {/* "Recent orders", not "all your orders" — archived orders leave the
          live table and won't appear here (PRD §6). */}
      <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl text-fg">
        Recent orders
      </h1>

      <div className="mt-6 inline-flex gap-1 rounded-full border border-line p-1">
        {(Object.keys(TABS) as TabName[]).map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={tab === name}
            onClick={() => setTab(name)}
            className={cn(
              "focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              tab === name ? "bg-ink text-paper" : "text-fg-muted hover:text-fg",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {isError ? (
        <EmptyState
          icon={LuReceipt}
          title="Couldn't load your orders."
          description="The server didn't answer. It may still be waking up."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isPending ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-card" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={LuReceipt}
            title={all.length === 0 ? "No orders yet." : `Nothing ${tab.toLowerCase()}.`}
            description={
              all.length === 0
                ? "Place an order and you can follow it from placed to ready."
                : undefined
            }
            actionLabel={all.length === 0 ? "Browse stores" : undefined}
            onAction={all.length === 0 ? () => router.push("/stores") : undefined}
          />
        </Card>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Paging is on the whole list, not the visible tab — a tab can be empty
          while later pages still hold matching orders. */}
      {hasNextPage && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
