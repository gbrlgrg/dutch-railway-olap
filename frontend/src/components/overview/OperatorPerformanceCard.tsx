import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard, type AsyncStatus } from "@/components/overview/ChartCard";
import { formatMinutes, formatNumber, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { OperatorPerformance } from "@/types/overview";

type SortKey = "averageDepartureDelayMinutes" | "cancellationRate";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "averageDepartureDelayMinutes", label: "Avg delay" },
  { value: "cancellationRate", label: "Cancellation" },
];

type OperatorPerformanceCardProps = {
  data: OperatorPerformance[];
  status: AsyncStatus;
  onRetry: () => void;
};

type TooltipPayload = { payload: OperatorPerformance };

function OperatorTooltip({ active, payload }: { active?: boolean; payload?: readonly TooltipPayload[] }) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{row.operator}</p>
      <p>Avg departure delay (stop-level): <span className="tabular-nums">{formatMinutes(row.averageDepartureDelayMinutes, 2)}</span></p>
      <p>Cancellation rate: <span className="tabular-nums">{formatPercent(row.cancellationRate, 2)}</span></p>
      <p className="text-muted-foreground">Distinct services: <span className="tabular-nums">{formatNumber(row.distinctServiceCount)}</span></p>
    </div>
  );
}

export function OperatorPerformanceCard({ data, status, onRetry }: OperatorPerformanceCardProps) {
  const [sortKey, setSortKey] = useState<SortKey>("averageDepartureDelayMinutes");
  const sorted = useMemo(
    () => [...data].sort((a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity)),
    [data, sortKey],
  );
  const isDelay = sortKey === "averageDepartureDelayMinutes";

  const sortControl = (
    <div role="group" aria-label="Sort operators by" className="inline-flex rounded-lg border bg-muted p-0.5">
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={sortKey === option.value}
          onClick={() => setSortKey(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            sortKey === option.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  return (
    <ChartCard
      title="Operator Performance"
      description={
        isDelay
          ? "Average departure delay over valid stop-level observations (min)."
          : "Cancellation rate as a share of distinct services."
      }
      action={sortControl}
      status={status}
      isEmpty={data.length === 0}
      onRetry={onRetry}
    >
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tickFormatter={(v: number) => (isDelay ? v.toFixed(1) : `${(v * 100).toFixed(1)}%`)}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="operator"
              width={88}
              tick={{ fontSize: 12, fill: "var(--foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<OperatorTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Bar
              dataKey={sortKey}
              fill={isDelay ? "var(--chart-1)" : "var(--chart-2)"}
              radius={[0, 3, 3, 0]}
              barSize={18}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Text alternative for assistive technology. */}
      <ul className="sr-only">
        {sorted.map((row) => (
          <li key={row.operator}>
            {row.operator}: average delay {formatMinutes(row.averageDepartureDelayMinutes)}, cancellation rate{" "}
            {formatPercent(row.cancellationRate)}, {formatNumber(row.distinctServiceCount)} distinct services.
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
