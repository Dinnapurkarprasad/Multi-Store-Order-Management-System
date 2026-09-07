"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { money } from "@/lib/money";
import type { OrdersPerDay, TopItem } from "@/lib/types";

// One height for the chart and its skeleton, so loading never reflows the page.
export const CHART_HEIGHT = 260;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * `day` arrives as a bare "2026-08-07" with no zone. Formatting it by slicing
 * the string keeps it exact — running it through new Date() is what plots
 * points a day early for anyone west of UTC.
 */
const dayLabel = (day: string) =>
  `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;

const axis = {
  stroke: "var(--color-fg-muted)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

/** Recharts' default tooltip is a white box — this one uses the skin's tokens. */
function ChartTooltip({
  active,
  payload,
  label,
  formatLabel,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: Record<string, unknown> }[];
  label?: string;
  formatLabel?: (value: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-input border border-line bg-card px-3 py-2 text-xs shadow-lg">
      {label && (
        <p className="font-medium text-fg">
          {formatLabel ? formatLabel(label) : label}
        </p>
      )}
      {payload.map((entry, index) => (
        <p key={index} className="mt-0.5 font-mono text-fg-muted">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function ChartFrame({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold tracking-[-0.02em] text-fg">
          {title}
        </h2>
        {note && <p className="text-xs text-fg-muted">{note}</p>}
      </div>
      <div className="mt-4" style={{ height: CHART_HEIGHT }}>
        {children}
      </div>
    </Card>
  );
}

export const ChartSkeleton = () => (
  <Skeleton className="size-full" style={{ height: CHART_HEIGHT }} />
);

export function OrdersPerDayChart({ data }: { data: OrdersPerDay[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="var(--color-line)" vertical={false} />
        {/* dataKey is the raw day string — passed straight through. */}
        <XAxis dataKey="day" tickFormatter={dayLabel} {...axis} minTickGap={24} />
        <YAxis allowDecimals={false} width={40} {...axis} />
        <Tooltip
          content={<ChartTooltip formatLabel={dayLabel} />}
          cursor={{ stroke: "var(--color-line)" }}
        />
        <Area
          type="monotone"
          dataKey="orders"
          name="Orders"
          stroke="var(--color-ember)"
          strokeWidth={2}
          fill="var(--color-ember-haze)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TopItemsChart({ data }: { data: TopItem[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 0, left: 8 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="item_name"
          width={128}
          {...axis}
          tickFormatter={(name: string) =>
            name.length > 18 ? `${name.slice(0, 17)}…` : name
          }
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "var(--color-line)" }}
        />
        <Bar dataKey="units_sold" name="Units" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((item) => (
            <Cell key={item.item_id} fill="var(--color-ember)" />
          ))}
          {/* Value at the bar end. Sorted by units, so the longest bar is not
              always the highest revenue — that's correct, not a bug. */}
          <LabelList
            dataKey="units_sold"
            position="right"
            className="fill-fg-muted font-mono text-xs"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Exported for the revenue table's footnote. */
export const earnedRevenueNote =
  "Completed orders only — this is money earned, not the value of everything ordered.";

export { money };
