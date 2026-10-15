import { CalendarRange, RefreshCw } from "lucide-react";

import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDemoTimestamp } from "@/lib/formatters";
import type { DateRangePreset } from "@/types/overview";

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "last-7-days", label: "Last 7 days" },
  { value: "last-30-days", label: "Last 30 days" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "last-12-months", label: "Last 12 months" },
  { value: "all-data", label: "All available data" },
];

type AppHeaderProps = {
  dateRange: DateRangePreset;
  onDateRangeChange: (value: DateRangePreset) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  dataTimestamp: string | null;
  isDemoData: boolean;
};

export function AppHeader({
  dateRange,
  onDateRangeChange,
  onRefresh,
  isRefreshing,
  dataTimestamp,
  isDemoData,
}: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b bg-card px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <MobileSidebar />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
            {isDemoData && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                Demo data
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            A high-level view of railway service reliability and performance.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {dataTimestamp && (
          <p className="mr-2 text-xs text-muted-foreground">
            {isDemoData ? "Demo timestamp" : "Last updated"}: {formatDemoTimestamp(dataTimestamp)}
          </p>
        )}
        <Select
          value={dateRange}
          onValueChange={(value) => value && onDateRangeChange(value as DateRangePreset)}
          items={DATE_RANGE_OPTIONS}
        >
          <SelectTrigger aria-label="Date range" className="min-w-44 bg-card">
            <CalendarRange className="text-muted-foreground" aria-hidden="true" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={isDemoData ? "Refresh demo data" : "Refresh data"}
          title={isDemoData ? "Re-computes the illustrative dataset; no server is contacted" : "Refresh data"}
        >
          <RefreshCw className={isRefreshing ? "animate-spin motion-reduce:animate-none" : undefined} aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
