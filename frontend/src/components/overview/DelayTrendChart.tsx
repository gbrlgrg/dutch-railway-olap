import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard, type AsyncStatus } from "@/components/overview/ChartCard";
import { GranularityToggle } from "@/components/overview/GranularityToggle";
import { formatMinutes, formatNumber, formatPeriod } from "@/lib/formatters";
import type { DelayTrendPoint, Granularity } from "@/types/overview";

type DelayTrendChartProps = {
  data: DelayTrendPoint[];
  granularity: Granularity;
  onGranularityChange: (value: Granularity) => void;
  status: AsyncStatus;
  onRetry: () => void;
};

type TooltipPayload = { payload: DelayTrendPoint };

function DelayTooltip({ active, payload }: { active?: boolean; payload?: readonly TooltipPayload[] }) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{formatPeriod(point.period, "long")}</p>
      <p>Avg departure delay: <span className="tabular-nums">{formatMinutes(point.averageDepartureDelayMinutes, 2)}</span></p>
      <p className="text-muted-foreground">
        Valid stop observations: <span className="tabular-nums">{formatNumber(point.validDelayObservationCount)}</span>
      </p>
    </div>
  );
}

function summarize(data: DelayTrendPoint[]): string {
  const values = data.map((d) => d.averageDepartureDelayMinutes).filter((v): v is number => v !== null);
  if (values.length === 0) return "No delay values in the selected period.";
  return `${data.length} periods shown. Average departure delay ranges from ${formatMinutes(Math.min(...values))} to ${formatMinutes(Math.max(...values))}.`;
}

export function DelayTrendChart({ data, granularity, onGranularityChange, status, onRetry }: DelayTrendChartProps) {
  return (
    <ChartCard
      title="Delay Trend"
      description="Average departure delay across the selected period."
      action={<GranularityToggle value={granularity} onChange={onGranularityChange} />}
      status={status}
      isEmpty={data.length === 0}
      onRetry={onRetry}
      skeletonClassName="h-72"
      className="xl:col-span-2"
    >
      <figure>
        <div className="h-72" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="delayFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
                tickFormatter={(v: number) => v.toFixed(1)}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={48}
                label={{ value: "min", angle: -90, position: "insideLeft", fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip content={<DelayTooltip />} />
              <Area
                type="monotone"
                dataKey="averageDepartureDelayMinutes"
                name="Average departure delay (min)"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#delayFill)"
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 text-xs text-muted-foreground">
          {summarize(data)} Illustrative values; no statistical trend is implied.
        </figcaption>
      </figure>
    </ChartCard>
  );
}
