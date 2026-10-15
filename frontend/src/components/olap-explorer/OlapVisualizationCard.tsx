import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, type AsyncStatus } from "@/components/overview/ChartCard";
import { getDimensionName } from "@/data/olapExplorerMockData";
import { formatMinutes, formatNumber, formatPercent } from "@/lib/formatters";
import type {
  GroupedTableResult,
  OlapMeasure,
  PivotTableResult,
} from "@/types/olapExplorer";

type OlapVisualizationCardProps = {
  isPivotMode: boolean;
  pivotResult: PivotTableResult | null;
  groupedResult: GroupedTableResult | null;
  measure: OlapMeasure;
  status: AsyncStatus;
  onRetry: () => void;
};

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

function formatMetricValue(value: number | null | undefined, measure: OlapMeasure): string {
  if (value === null || value === undefined) return "—";
  switch (measure) {
    case "averageDepartureDelayMinutes":
      return formatMinutes(value, 2);
    case "cancellationRate":
      return formatPercent(value, 2);
    case "distinctServiceCount":
    case "validDelayObservationCount":
      return formatNumber(value);
  }
}

function getMeasureLabel(measure: OlapMeasure): string {
  switch (measure) {
    case "averageDepartureDelayMinutes":
      return "Average Departure Delay (min)";
    case "cancellationRate":
      return "Cancellation Rate (%)";
    case "distinctServiceCount":
      return "Distinct Services Operated";
    case "validDelayObservationCount":
      return "Valid Delay Observations";
  }
}

type TooltipPayloadItem = {
  name: string;
  value: number;
  color: string;
};

function PivotTooltip({
  active,
  payload,
  label,
  measure,
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: string;
  measure: OlapMeasure;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md space-y-1.5 max-w-xs">
      <p className="font-semibold text-foreground border-b pb-1">{label}</p>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 truncate text-muted-foreground">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="truncate">{item.name}:</span>
            </span>
            <span className="font-medium tabular-nums shrink-0">
              {formatMetricValue(item.value, measure)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OlapVisualizationCard({
  isPivotMode,
  pivotResult,
  groupedResult,
  measure,
  status,
  onRetry,
}: OlapVisualizationCardProps) {
  const yTickFormatter = (val: number) => {
    if (measure === "averageDepartureDelayMinutes") return val.toFixed(1);
    if (measure === "cancellationRate") return `${(val * 100).toFixed(1)}%`;
    return formatNumber(val);
  };

  if (isPivotMode && pivotResult) {
    const { rowDimension, columnDimension, columnKeys, columnLabels, rows } = pivotResult;
    const chartTitle = `${getMeasureLabel(measure)} by ${getDimensionName(rowDimension)} across ${getDimensionName(columnDimension)}`;
    const chartDescription = `Cross-tabulated multi-series comparison. Each bar series represents a ${getDimensionName(columnDimension)}.`;

    // Limit visible column series in the chart to top 12 to avoid overwhelming visual clutter
    const visibleColKeys = columnKeys.slice(0, 12);

    const chartData = rows.map((r) => {
      const dataPoint: Record<string, string | number | null> = {
        name: r.rowLabel,
      };
      for (const ck of visibleColKeys) {
        dataPoint[ck] = (r.cells[ck]?.[measure] as number | null) ?? 0;
      }
      return dataPoint;
    });

    return (
      <ChartCard
        title={chartTitle}
        description={chartDescription}
        status={status}
        isEmpty={rows.length === 0}
        onRetry={onRetry}
        skeletonClassName="h-80"
      >
        <figure>
          <div className="h-80 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={yTickFormatter}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<PivotTooltip measure={measure} />} cursor={{ fill: "var(--muted)/30" }} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(val: string) => columnLabels[val] ?? val}
                  iconType="circle"
                  iconSize={8}
                />
                {visibleColKeys.map((ck, idx) => (
                  <Bar
                    key={ck}
                    dataKey={ck}
                    name={columnLabels[ck] ?? ck}
                    fill={SERIES_COLORS[idx % SERIES_COLORS.length]}
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>{rows.length} rows × {visibleColKeys.length} series plotted.</span>
            <span>All values represent weighted aggregates.</span>
          </figcaption>
        </figure>
      </ChartCard>
    );
  }

  // Grouped Mode Chart
  const rows = groupedResult?.rows ?? [];
  const rowDimName = groupedResult ? getDimensionName(groupedResult.rowDimension) : "Category";
  const chartTitle = `${getMeasureLabel(measure)} by ${rowDimName}`;
  const chartDescription = `Ranked distribution of ${getMeasureLabel(measure)} across ${rowDimName}.`;

  const chartData = rows.map((r) => ({
    name: r.groupLabel,
    value: (r.values[measure] as number | null) ?? 0,
  }));

  return (
    <ChartCard
      title={chartTitle}
      description={chartDescription}
      status={status}
      isEmpty={rows.length === 0}
      onRetry={onRetry}
      skeletonClassName="h-80"
    >
      <figure>
        <div className="h-80 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                tickFormatter={yTickFormatter}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                formatter={(val) => [formatMetricValue(typeof val === "number" ? val : null, measure), getMeasureLabel(measure)]}
                cursor={{ fill: "var(--muted)/30" }}
              />
              <Bar
                dataKey="value"
                name={getMeasureLabel(measure)}
                fill="var(--chart-1)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 text-xs text-muted-foreground">
          Single dimension aggregate across the matching sub-cube.
        </figcaption>
      </figure>
    </ChartCard>
  );
}
