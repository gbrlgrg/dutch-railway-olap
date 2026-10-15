/**
 * UI contracts for the Overview dashboard.
 * Units and aggregation grain are explicit in field names. These are not final
 * SQL definitions; confirm against the loaded dataset before API integration.
 */

export type DateRangePreset =
  | "last-7-days"
  | "last-30-days"
  | "last-3-months"
  | "last-6-months"
  | "last-12-months"
  | "all-data";

export type Granularity = "day" | "month" | "year";

export type OverviewMetrics = {
  /** Mean over valid (non-null) stop-level departure-delay observations. */
  averageDepartureDelayMinutes: number | null;
  /** Distinct service identifiers, not stop rows. */
  distinctServiceCount: number;
  /** Cancelled distinct services / distinct services, 0..1. */
  cancellationRate: number | null;
  distinctStationCount: number;
};

export type MetricComparison = {
  /** Change versus the previous equivalent period, same unit as the metric. */
  averageDepartureDelayMinutesDelta: number | null;
  distinctServiceCountDelta: number | null;
  cancellationRateDelta: number | null;
  distinctStationCountDelta: number | null;
};

export type DelayTrendPoint = {
  period: string;
  averageDepartureDelayMinutes: number | null;
  validDelayObservationCount: number;
};

export type CancellationTrendPoint = {
  period: string;
  cancelledServiceCount: number;
  distinctServiceCount: number;
  cancellationRate: number | null;
};

export type OperatorPerformance = {
  operator: string;
  averageDepartureDelayMinutes: number | null;
  distinctServiceCount: number;
  cancellationRate: number | null;
};

export type StationDelay = {
  stationName: string;
  averageDepartureDelayMinutes: number | null;
  validDelayObservationCount: number;
};

export type OverviewQuery = {
  dateRange: DateRangePreset;
  granularity: Granularity;
};

/** Mirrors the planned `GET /api/analytics/overview` response sections. */
export type OverviewData = {
  metrics: OverviewMetrics;
  comparison: MetricComparison;
  delayTrend: DelayTrendPoint[];
  cancellationTrend: CancellationTrendPoint[];
  operatorPerformance: OperatorPerformance[];
  highestDelayStations: StationDelay[];
  /** Demo timestamp of the dataset snapshot (ISO string). */
  dataTimestamp: string;
  isDemoData: boolean;
};
