import { getTimeTrendMockData } from "@/data/timeTrendMockData";
import type { TimeTrendData, TimeTrendFilterState } from "@/types/timeTrend";

/**
 * Service boundary for Time & Trend Analysis.
 *
 * Future API integration:
 * Replace this implementation with:
 *   GET /api/analytics/time-trend?from=...&to=...&granularity=...&parentPeriod=...
 * Frontend never sends arbitrary SQL; backend validates query parameters and invokes
 * optimized analytical SQL roll-up/drill-down queries.
 */
export async function fetchTimeTrend(filters: TimeTrendFilterState): Promise<TimeTrendData> {
  return getTimeTrendMockData(filters);
}
