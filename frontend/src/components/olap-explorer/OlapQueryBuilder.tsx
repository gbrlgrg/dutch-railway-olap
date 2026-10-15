import { ArrowLeftRight, Columns, LayoutGrid, Rows3, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { OlapDimension, OlapMeasure } from "@/types/olapExplorer";

const ROW_DIMENSIONS: { value: OlapDimension; label: string }[] = [
  { value: "operator", label: "Operator" },
  { value: "station", label: "Station" },
  { value: "serviceType", label: "Service Type" },
  { value: "year", label: "Year" },
  { value: "quarter", label: "Quarter" },
  { value: "month", label: "Month" },
];

const COLUMN_DIMENSIONS: { value: string; label: string }[] = [
  { value: "none", label: "None (Grouped Table Mode)" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "serviceType", label: "Service Type" },
  { value: "operator", label: "Operator" },
  { value: "station", label: "Station" },
];

const MEASURE_OPTIONS: { value: OlapMeasure; label: string; unit: string }[] = [
  { value: "averageDepartureDelayMinutes", label: "Average Departure Delay", unit: "min" },
  { value: "cancellationRate", label: "Cancellation Rate", unit: "%" },
  { value: "distinctServiceCount", label: "Distinct Services Operated", unit: "services" },
  { value: "validDelayObservationCount", label: "Valid Delay Observations", unit: "observations" },
];

type OlapQueryBuilderProps = {
  rowDimension: OlapDimension;
  columnDimension: OlapDimension | null;
  measure: OlapMeasure;
  onRowDimensionChange: (dim: OlapDimension) => void;
  onColumnDimensionChange: (dim: OlapDimension | null) => void;
  onSwapDimensions: () => void;
  onMeasureChange: (measure: OlapMeasure) => void;
};

export function OlapQueryBuilder({
  rowDimension,
  columnDimension,
  measure,
  onRowDimensionChange,
  onColumnDimensionChange,
  onSwapDimensions,
  onMeasureChange,
}: OlapQueryBuilderProps) {
  const isPivot = columnDimension !== null;

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            OLAP Query Configuration & Orientation
          </span>
        </div>

        {/* Mode Toggle Button Group */}
        <div role="group" aria-label="OLAP Layout Mode" className="inline-flex rounded-lg border bg-muted p-0.5">
          <button
            type="button"
            aria-pressed={!isPivot}
            onClick={() => onColumnDimensionChange(null)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
              !isPivot
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="size-3" aria-hidden="true" />
            <span>Grouped Report</span>
          </button>
          <button
            type="button"
            aria-pressed={isPivot}
            onClick={() => {
              if (!isPivot) {
                // Default pivot column if currently null
                onColumnDimensionChange(rowDimension === "month" ? "operator" : "month");
              }
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
              isPivot
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Columns className="size-3" aria-hidden="true" />
            <span>Pivot Matrix</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
        {/* Row Dimension */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Rows3 className="size-3.5 text-muted-foreground" aria-hidden="true" />
            Row Dimension (Group By):
          </label>
          <Select
            value={rowDimension}
            onValueChange={(val) => val && onRowDimensionChange(val as OlapDimension)}
            items={ROW_DIMENSIONS}
          >
            <SelectTrigger className="w-full bg-card h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROW_DIMENSIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Column Dimension (Pivot) & Swap */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Columns className="size-3.5 text-muted-foreground" aria-hidden="true" />
              Column Dimension (Pivot By):
            </label>
            {isPivot && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSwapDimensions}
                aria-label="Swap row and column dimensions"
                title="Swap row and column dimensions"
                className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-primary"
              >
                <ArrowLeftRight className="size-3" aria-hidden="true" />
                <span>Swap</span>
              </Button>
            )}
          </div>
          <Select
            value={columnDimension ?? "none"}
            onValueChange={(val) => onColumnDimensionChange(val === "none" ? null : (val as OlapDimension))}
            items={COLUMN_DIMENSIONS}
          >
            <SelectTrigger className="w-full bg-card h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLUMN_DIMENSIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Primary Measure */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-foreground">
            Analysis Measure:
          </label>
          <Select
            value={measure}
            onValueChange={(val) => val && onMeasureChange(val as OlapMeasure)}
            items={MEASURE_OPTIONS}
          >
            <SelectTrigger className="w-full bg-card h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEASURE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label} ({opt.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
