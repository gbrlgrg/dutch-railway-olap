import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard, type AsyncStatus } from "@/components/overview/ChartCard";
import { formatNumber, formatPercent, formatPeriod } from "@/lib/formatters";
import type { CancellationTrendPoint } from "@/types/overview";

type CancellationTrendChartProps = {
  data: CancellationTrendPoint[];
  status: AsyncStatus;
  onRetry: () => void;
};

type TooltipPayload = { payload: CancellationTrendPoint };

function CancellationTooltip({ active, payload }: { active?: boolean; payload?: readonly TooltipPayload[] }) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{formatPeriod(point.period, "long")}</p>
      <p>Cancellation rate: <span className="tabular-nums">{formatPercent(point.cancellationRate, 2)}</span></p>
      <p className="text-muted-foreground">
        Cancelled services: <span className="tabular-nums">{formatNumber(point.cancelledServiceCount)}</span> of{" "}
        <span className="tabular-nums">{formatNumber(point.distinctServiceCount)}</span> distinct services
      </p>
    </div>
  );
}

export function CancellationTrendChart({ data, status, onRetry }: CancellationTrendChartProps) {
  const rates = data.map((d) => d.cancellationRate).filter((v): v is number => v !== null);
  const summary =
    rates.length > 0
      ? `Service-level cancellation rate ranges from ${formatPercent(Math.min(...rates))} to ${formatPercent(Math.max(...rates))}.`
      : "No cancellation data in the selected period.";

  return (
    <ChartCard
      title="Cancellations Over Time"
      description="Share of distinct services cancelled per period."
      status={status}
      isEmpty={data.length === 0}
      onRetry={onRetry}
    >
      <figure>
        <div className="h-64" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="period"
                tickFormatter={(v: string) => formatPeriod(v)}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<CancellationTooltip />} cursor={{ fill: "var(--muted)" }} />
              <Bar
                dataKey="cancellationRate"
                name="Cancellation rate (% of distinct services)"
                fill="var(--chart-2)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 text-xs text-muted-foreground">{summary}</figcaption>
      </figure>
    </ChartCard>
  );
}
