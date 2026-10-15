import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard, type AsyncStatus } from "@/components/overview/ChartCard";
import { formatNumber, formatPercent } from "@/lib/formatters";
import type { TimeGranularity, TimeTrendPoint } from "@/types/timeTrend";

type CancellationTrendChartProps = {
  data: TimeTrendPoint[];
  granularity: TimeGranularity;
  status: AsyncStatus;
  onDrillDown: (periodKey: string) => void;
  onRetry: () => void;
};

type TooltipPayloadItem = {
  payload: TimeTrendPoint;
};

function CancellationTooltip({
  active,
  payload,
  canDrillDown,
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  canDrillDown: boolean;
}) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-semibold text-foreground">{point.label}</p>
      <p>
        Cancellation Rate:{" "}
        <span className="font-medium tabular-nums">{formatPercent(point.cancellationRate, 2)}</span>
      </p>
      <p className="text-muted-foreground text-[11px]">
        Cancelled: <span className="tabular-nums">{formatNumber(point.cancelledServiceCount)}</span> /{" "}
        <span className="tabular-nums">{formatNumber(point.distinctServiceCount)}</span> services
      </p>
      {canDrillDown && (
        <p className="pt-1 text-[11px] font-medium text-primary">Click bar to drill down</p>
      )}
    </div>
  );
}

export function CancellationTrendChart({
  data,
  granularity,
  status,
  onDrillDown,
  onRetry,
}: CancellationTrendChartProps) {
  const canDrillDown = granularity !== "day";

  return (
    <ChartCard
      title="Cancellation Trend"
      description="Service-level cancellation rate across periods."
      status={status}
      isEmpty={data.length === 0}
      onRetry={onRetry}
      skeletonClassName="h-64"
    >
      <figure>
        <div className="h-64 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onClick={(state) => {
                const clickedPoint = (state as unknown as { activePayload?: Array<{ payload: TimeTrendPoint }> })
                  ?.activePayload?.[0]?.payload;
                if (clickedPoint && canDrillDown) {
                  onDrillDown(clickedPoint.periodKey);
                }
              }}
              style={{ cursor: canDrillDown ? "pointer" : "default" }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                tickFormatter={(val: number) => `${(val * 100).toFixed(1)}%`}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={<CancellationTooltip canDrillDown={canDrillDown} />} cursor={{ fill: "var(--muted)/40" }} />
              <Bar
                dataKey="cancellationRate"
                name="Cancellation Rate"
                fill="var(--chart-2)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 text-xs text-muted-foreground">
          Calculated from distinct cancelled services / total distinct services.
        </figcaption>
      </figure>
    </ChartCard>
  );
}
