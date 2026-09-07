"use client";

import { LuReceipt } from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { money } from "@/lib/money";
import { useAllOrders } from "@/lib/mutations/adminActions";
import { useAdvanceOrder } from "@/lib/mutations/ownerActions";
import { relativeTime } from "@/lib/time";
import type { OrderStatus } from "@/lib/types";

// Same derivation as the owner's ticket — an admin can advance any order.
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PLACED: { status: "PREPARING", label: "Start preparing" },
  PREPARING: { status: "COMPLETED", label: "Complete" },
};

export default function AdminOrdersPage() {
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAllOrders();
  const advance = useAdvanceOrder();

  const orders = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
      <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl text-fg">
        Orders
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        Every order on the platform, newest first. Archived orders aren&apos;t
        here — they leave the live table.
      </p>

      <Card className="mt-6 p-5">
        {isError ? (
          <EmptyState
            icon={LuReceipt}
            title="Couldn't load orders."
            actionLabel="Try again"
            onAction={() => refetch()}
          />
        ) : isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState icon={LuReceipt} title="No orders yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-fg-muted">
                  <th className="py-2 font-medium">Order</th>
                  <th className="py-2 font-medium">Store</th>
                  <th className="py-2 font-medium">Items</th>
                  <th className="py-2 text-right font-medium">Total</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Placed</th>
                  <th className="py-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const next = NEXT[order.status];
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-line/60 last:border-b-0"
                    >
                      <td className="py-3 font-mono text-fg">
                        #{order.id.slice(0, 6)}
                      </td>
                      <td className="py-3 text-fg">{order.store_name}</td>
                      <td className="max-w-[220px] truncate py-3 text-fg-muted">
                        {order.items
                          .map((line) => `${line.qty}× ${line.name}`)
                          .join(", ")}
                      </td>
                      <td className="py-3 text-right font-mono text-fg">
                        {money(order.total_amount)}
                      </td>
                      <td className="py-3">
                        <Badge status={order.status} />
                      </td>
                      <td className="py-3 text-fg-muted">
                        {relativeTime(order.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        {next && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={
                              advance.isPending && advance.variables?.id === order.id
                            }
                            onClick={() =>
                              advance.mutate({ id: order.id, status: next.status })
                            }
                          >
                            {next.label}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
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
