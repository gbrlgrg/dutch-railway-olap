import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, type AsyncStatus } from "@/components/overview/ChartCard";
import { formatMinutes, formatNumber, formatPercent } from "@/lib/formatters";
import type { TimeGranularity, TimeTrendMetric, TimeTrendPoint } from "@/types/timeTrend";

type MainPerformanceChartProps = {
  data: TimeTrendPoint[];
  metric: TimeTrendMetric;
  granularity: TimeGranularity;
  scopeLabel: string;
  compareToPrevious: boolean;
  status: AsyncStatus;
  onDrillDown: (periodKey: string) => void;
  onRetry: () => void;
};

type TooltipPayloadItem = {
  payload: TimeTrendPoint;
  value: number;
  dataKey: string;
};

function formatMetricValue(value: number | null | undefined, metric: TimeTrendMetric): string {
  if (value === null || value === undefined) return "—";
  switch (metric) {
    case "averageDepartureDelayMinutes":
      return formatMinutes(value, 2);
    case "cancellationRate":
      return formatPercent(value, 2);
    case "distinctServiceCount":
    case "validDelayObservationCount":
      return formatNumber(value);
  }
}

function getMetricLabel(metric: TimeTrendMetric): string {
  switch (metric) {
    case "averageDepartureDelayMinutes":
      return "Average Departure Delay (min)";
    case "cancellationRate":
      return "Cancellation Rate (%)";
    case "distinctServiceCount":
      return "Distinct Services";
    case "validDelayObservationCount":
      return "Valid Delay Observations";
  }
}

function getComparisonDataKey(metric: TimeTrendMetric): string | null {
  switch (metric) {
    case "averageDepartureDelayMinutes":
      return "previousPeriodAverageDelayMinutes";
    case "cancellationRate":
      return "previousPeriodCancellationRate";
    case "distinctServiceCount":
      return "previousPeriodDistinctServices";
    case "validDelayObservationCount":
      return "previousPeriodValidObservations";
  }
}

function CustomTooltip({
  active,
  payload,
  metric,
  canDrillDown,
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  metric: TimeTrendMetric;
  canDrillDown: boolean;
}) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;

  const metricValue = point[metric] as number | null;
  const prevValueKey = getComparisonDataKey(metric);
  const prevValue = prevValueKey ? (point[prevValueKey as keyof TimeTrendPoint] as number | null) : null;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-semibold text-foreground">{point.label}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">{getMetricLabel(metric)}:</span>
        <span className="font-medium tabular-nums">{formatMetricValue(metricValue, metric)}</span>
      </div>

      {prevValue !== null && prevValue !== undefined && (
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>Previous equivalent period:</span>
          <span className="tabular-nums">{formatMetricValue(prevValue, metric)}</span>
        </div>
      )}

      <div className="border-t pt-1 mt-1 text-[11px] text-muted-foreground space-y-0.5">
        <p>Services: <span className="tabular-nums">{formatNumber(point.distinctServiceCount)}</span></p>
        <p>Valid Delay Obs: <span className="tabular-nums">{formatNumber(point.validDelayObservationCount)}</span></p>
      </div>

      {canDrillDown && (
        <p className="pt-1 text-[11px] font-medium text-primary">
          Click point to drill down
        </p>
      )}
    </div>
  );
}

export function MainPerformanceChart({
  data,
  metric,
  granularity,
  scopeLabel,
  compareToPrevious,
  status,
  onDrillDown,
  onRetry,
}: MainPerformanceChartProps) {
  const canDrillDown = granularity !== "day";
  const comparisonKey = compareToPrevious ? getComparisonDataKey(metric) : null;

  const yTickFormatter = (val: number) => {
    if (metric === "averageDepartureDelayMinutes") return val.toFixed(1);
    if (metric === "cancellationRate") return `${(val * 100).toFixed(1)}%`;
    return formatNumber(val);
  };

  const granularityTitle =
    granularity === "year" ? "Year"
    : granularity === "quarter" ? "Quarter"
    : granularity === "month" ? "Month"
    : "Day";

  const description = `${getMetricLabel(metric)} by ${granularityTitle} in ${scopeLabel}.${canDrillDown ? " Click a period point to drill down." : ""}`;

  return (
    <ChartCard
      title="Performance Over Time"
      description={description}
      status={status}
      isEmpty={data.length === 0}
      onRetry={onRetry}
      skeletonClassName="h-80"
    >
      <figure>
        <div className="h-80 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
              onClick={(state) => {
                const clickedPoint = (state as unknown as { activePayload?: Array<{ payload: TimeTrendPoint }> })
                  ?.activePayload?.[0]?.payload;
                if (clickedPoint && canDrillDown) {
                  onDrillDown(clickedPoint.periodKey);
                }
              }}
              style={{ cursor: canDrillDown ? "pointer" : "default" }}
            >
              <defs>
                <linearGradient id="mainPerformanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={20}
              />
              <YAxis
                tickFormatter={yTickFormatter}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                content={<CustomTooltip metric={metric} canDrillDown={canDrillDown} />}
              />
              <Area
                type="monotone"
                dataKey={metric}
                name={getMetricLabel(metric)}
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                fill="url(#mainPerformanceFill)"
                activeDot={{ r: 6, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              {comparisonKey && (
                <Line
                  type="monotone"
                  dataKey={comparisonKey}
                  name="Previous Equivalent Period"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>{data.length} periods displayed. {canDrillDown ? "Interactive: click any node or bar to drill down." : "Leaf level reached."}</span>
          {compareToPrevious && <span className="italic">Dashed line: previous equivalent period benchmark</span>}
        </figcaption>
      </figure>
    </ChartCard>
  );
}
