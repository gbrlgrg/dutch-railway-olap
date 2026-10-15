import { CalendarRange, SlidersHorizontal } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { DateRangePreset, TimeGranularity, TimeTrendMetric } from "@/types/timeTrend";

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "last-30-days", label: "Last 30 days" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "last-6-months", label: "Last 6 months" },
  { value: "last-12-months", label: "Last 12 months" },
  { value: "all-data", label: "All available data" },
];

const GRANULARITY_OPTIONS: { value: TimeGranularity; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "quarter", label: "Quarter" },
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
];

const METRIC_OPTIONS: { value: TimeTrendMetric; label: string; unit: string }[] = [
  { value: "averageDepartureDelayMinutes", label: "Average Departure Delay", unit: "min" },
  { value: "cancellationRate", label: "Cancellation Rate", unit: "%" },
  { value: "distinctServiceCount", label: "Distinct Services", unit: "services" },
  { value: "validDelayObservationCount", label: "Valid Delay Observations", unit: "observations" },
];

type TimeTrendControlsProps = {
  dateRange: DateRangePreset;
  granularity: TimeGranularity;
  metric: TimeTrendMetric;
  compareToPrevious: boolean;
  onDateRangeChange: (value: DateRangePreset) => void;
  onGranularityChange: (value: TimeGranularity) => void;
  onMetricChange: (value: TimeTrendMetric) => void;
  onCompareChange: (value: boolean) => void;
};

export function TimeTrendControls({
  dateRange,
  granularity,
  metric,
  compareToPrevious,
  onDateRangeChange,
  onGranularityChange,
  onMetricChange,
  onCompareChange,
}: TimeTrendControlsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 lg:flex-row lg:items-center lg:justify-between shadow-xs">
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <Select
            value={dateRange}
            onValueChange={(val) => val && onDateRangeChange(val as DateRangePreset)}
            items={DATE_RANGE_OPTIONS}
          >
            <SelectTrigger aria-label="Date range" className="w-44 bg-card h-8 text-xs">
              <CalendarRange className="size-3.5 text-muted-foreground mr-1" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Granularity Segmented Toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Granularity:</span>
          <div role="group" aria-label="Hierarchy Granularity" className="inline-flex rounded-lg border bg-muted p-0.5">
            {GRANULARITY_OPTIONS.map((opt) => {
              const selected = opt.value === granularity;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onGranularityChange(opt.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Metric Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <SlidersHorizontal className="size-3 text-muted-foreground" aria-hidden="true" />
            Chart Metric:
          </span>
          <Select
            value={metric}
            onValueChange={(val) => val && onMetricChange(val as TimeTrendMetric)}
            items={METRIC_OPTIONS}
          >
            <SelectTrigger aria-label="Primary Chart Metric" className="w-56 bg-card h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label} ({opt.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comparison Toggle */}
        <div className="flex items-center gap-2 border-l pl-3">
          <label
            htmlFor="compare-switch"
            className="text-xs font-medium text-foreground cursor-pointer select-none"
          >
            Compare to previous period
          </label>
          <Switch
            id="compare-switch"
            size="sm"
            checked={compareToPrevious}
            onCheckedChange={onCompareChange}
            aria-label="Compare to previous equivalent period"
          />
        </div>
      </div>
    </div>
  );
}
