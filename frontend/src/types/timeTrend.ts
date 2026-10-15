/**
 * UI contracts for the Time & Trend Analysis OLAP page.
 * Strictly typed temporal hierarchies: Year -> Quarter -> Month -> Day.
 */

export type DateRangePreset =
  | "last-7-days"
  | "last-30-days"
  | "last-3-months"
  | "last-6-months"
  | "last-12-months"
  | "all-data";

export type TimeGranularity = "year" | "quarter" | "month" | "day";

export type TimeTrendMetric =
  | "averageDepartureDelayMinutes"
  | "cancellationRate"
  | "distinctServiceCount"
  | "validDelayObservationCount";

export type HierarchyBreadcrumb = {
  granularity: TimeGranularity | "root";
  periodKey: string;
  label: string;
};

export type TimeTrendPoint = {
  periodKey: string; // e.g., "2024", "2024-Q3", "2024-08", "2024-08-14"
  label: string;
  granularity: TimeGranularity;
  parentPeriodKey: string | null;
  distinctServiceCount: number;
  cancelledServiceCount: number;
  cancellationRate: number | null;
  validDelayObservationCount: number;
  totalDepartureDelayMinutes: number;
  averageDepartureDelayMinutes: number | null;
  previousPeriodAverageDelayMinutes?: number | null;
  previousPeriodCancellationRate?: number | null;
  previousPeriodDistinctServices?: number | null;
  previousPeriodValidObservations?: number | null;
};

export type TimeTrendSummary = {
  scopeLabel: string;
  distinctServiceCount: number;
  cancelledServiceCount: number;
  cancellationRate: number | null;
  validDelayObservationCount: number;
  totalDepartureDelayMinutes: number;
  averageDepartureDelayMinutes: number | null;
  previousPeriodAverageDelayMinutes?: number | null;
  previousPeriodCancellationRate?: number | null;
  previousPeriodDistinctServices?: number | null;
  previousPeriodValidObservations?: number | null;
};

export type TimeTrendFilterState = {
  dateRange: DateRangePreset;
  granularity: TimeGranularity;
  metric: TimeTrendMetric;
  selectedParentPeriodKey: string | null;
  compareToPrevious: boolean;
};

export type TimeTrendData = {
  breadcrumbs: HierarchyBreadcrumb[];
  scopeLabel: string;
  activeGranularity: TimeGranularity;
  parentScopeDescription: string;
  points: TimeTrendPoint[];
  summary: TimeTrendSummary;
  dataTimestamp: string;
  isDemoData: boolean;
};
