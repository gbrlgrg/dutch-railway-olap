import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard, type AsyncStatus } from "@/components/overview/ChartCard";
import { formatNumber } from "@/lib/formatters";
import type { TimeGranularity, TimeTrendPoint } from "@/types/timeTrend";

type ObservationVolumeChartProps = {
  data: TimeTrendPoint[];
  granularity: TimeGranularity;
  status: AsyncStatus;
  onDrillDown: (periodKey: string) => void;
  onRetry: () => void;
};

type TooltipPayloadItem = {
  payload: TimeTrendPoint;
};

function VolumeTooltip({
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
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Valid Delay Obs:</span>
        <span className="font-medium tabular-nums">{formatNumber(point.validDelayObservationCount)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Distinct Services:</span>
        <span className="font-medium tabular-nums">{formatNumber(point.distinctServiceCount)}</span>
      </div>
      <p className="text-[10px] text-muted-foreground pt-1 border-t">
        Ratio: {(point.validDelayObservationCount / Math.max(1, point.distinctServiceCount)).toFixed(1)} stops/service
      </p>
      {canDrillDown && (
        <p className="pt-0.5 text-[11px] font-medium text-primary">Click bar to drill down</p>
      )}
    </div>
  );
}

export function ObservationVolumeChart({
  data,
  granularity,
  status,
  onDrillDown,
  onRetry,
}: ObservationVolumeChartProps) {
  const canDrillDown = granularity !== "day";

  return (
    <ChartCard
      title="Observation Volume & Service Count"
      description="Compare stop-level delay sample size against distinct operated services."
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
                tickFormatter={(val: number) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val))}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={<VolumeTooltip canDrillDown={canDrillDown} />} cursor={{ fill: "var(--muted)/40" }} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="validDelayObservationCount"
                name="Valid Delay Observations (Stops)"
                fill="var(--chart-3)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="distinctServiceCount"
                name="Distinct Services (Trains)"
                fill="var(--chart-5)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 text-xs text-muted-foreground">
          Clear grain separation: Stop observations back the delay average; distinct services back cancellation rate.
        </figcaption>
      </figure>
    </ChartCard>
  );
}
