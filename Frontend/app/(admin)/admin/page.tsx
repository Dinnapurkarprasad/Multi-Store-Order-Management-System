"use client";

import { useState } from "react";
import { LuChartNoAxesColumn } from "react-icons/lu";
import { RangeSwitcher } from "@/components/analytics/RangeSwitcher";
import { StatCard } from "@/components/analytics/StatCard";
import {
  ChartFrame,
  ChartSkeleton,
  OrdersPerDayChart,
  TopItemsChart,
  earnedRevenueNote,
} from "@/components/analytics/charts";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { money } from "@/lib/money";
import {
  type RangeDays,
  useOrdersPerDay,
  useRevenuePerStore,
  useSummary,
  useTopItems,
} from "@/lib/mutations/analyticsActions";

export default function AdminOverviewPage() {
  const [days, setDays] = useState<RangeDays>(30);

  // No store_id — an admin sees every store.
  const summary = useSummary(days);
  const perDay = useOrdersPerDay(days);
  const topItems = useTopItems(days);
  const revenue = useRevenuePerStore(days);

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl text-fg">
            Platform
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Every store, every order. Archived orders still count here.
          </p>
        </div>
        <RangeSwitcher value={days} onChange={setDays} />
      </div>

      {/* summary.total_revenue counts EVERY status, so it is not "earned" —
          calling both numbers "revenue" would make two different figures look
          like one number rendered twice (PRD §6). */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Orders"
          value={summary.data ? String(summary.data.total_orders) : "—"}
          loading={summary.isPending}
        />
        <StatCard
          label="Order value"
          value={summary.data ? money(summary.data.total_revenue) : "—"}
          note="All statuses, including orders still in progress"
          loading={summary.isPending}
        />
        <StatCard
          label="Avg order"
          value={summary.data ? money(summary.data.avg_order_value) : "—"}
          loading={summary.isPending}
        />
        <StatCard
          label="Active now"
          value={summary.data ? String(summary.data.active_orders) : "—"}
          note="Not yet completed"
          loading={summary.isPending}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartFrame title="Orders per day" note={`Last ${days} days`}>
          {perDay.isPending ? (
            <ChartSkeleton />
          ) : perDay.data && perDay.data.length > 0 ? (
            <OrdersPerDayChart data={perDay.data} />
          ) : (
            <EmptyState icon={LuChartNoAxesColumn} title="No orders in this range." />
          )}
        </ChartFrame>

        <ChartFrame title="Top items" note="By units sold">
          {topItems.isPending ? (
            <ChartSkeleton />
          ) : topItems.data && topItems.data.length > 0 ? (
            <TopItemsChart data={topItems.data} />
          ) : (
            <EmptyState icon={LuChartNoAxesColumn} title="Nothing sold in this range." />
          )}
        </ChartFrame>
      </div>

      {/* The main artifact of this screen (PRD §6). */}
      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold tracking-[-0.02em] text-fg">
            Earned revenue per store
          </h2>
          <p className="text-xs text-fg-muted">{earnedRevenueNote}</p>
        </div>

        <div className="mt-4 overflow-x-auto">
          {revenue.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !revenue.data || revenue.data.length === 0 ? (
            <EmptyState icon={LuChartNoAxesColumn} title="No stores yet." />
          ) : (
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-fg-muted">
                  <th className="py-2 font-medium">Store</th>
                  <th className="py-2 text-right font-medium">Completed orders</th>
                  <th className="py-2 text-right font-medium">Earned revenue</th>
                </tr>
              </thead>
              <tbody>
                {revenue.data.map((row) => (
                  <tr
                    key={row.store_id}
                    className="border-b border-line/60 last:border-b-0"
                  >
                    <td className="py-3 text-fg">{row.store_name}</td>
                    <td className="py-3 text-right font-mono text-fg-muted">
                      {row.order_count}
                    </td>
                    <td className="py-3 text-right font-mono text-fg">
                      {money(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
