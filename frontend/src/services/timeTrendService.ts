import { fetchCachedJson } from "@/services/overviewService";
import type {
  DateRangePreset,
  HierarchyBreadcrumb,
  TimeGranularity,
  TimeTrendData,
  TimeTrendFilterState,
  TimeTrendPoint,
  TimeTrendSummary,
} from "@/types/timeTrend";

const DATASET_END = "2025-12-31";
const DATASET_START = "2025-01-01";
const DAY_MS = 86_400_000;

const RANGE_DAYS: Record<Exclude<DateRangePreset, "all-data">, number> = {
  "last-7-days": 7,
  "last-30-days": 30,
  "last-3-months": 91,
  "last-6-months": 182,
  "last-12-months": 365,
};

function resolvePresetRange(preset: DateRangePreset): { startDate: string; endDate: string } {
  if (preset === "all-data" || preset === "last-12-months") {
    return { startDate: DATASET_START, endDate: DATASET_END };
  }
  const endMs = new Date(`${DATASET_END}T00:00:00Z`).getTime();
  const days = RANGE_DAYS[preset];
  const startMs = Math.max(
    new Date(`${DATASET_START}T00:00:00Z`).getTime(),
    endMs - (days - 1) * DAY_MS,
  );
  return {
    startDate: new Date(startMs).toISOString().slice(0, 10),
    endDate: DATASET_END,
  };
}

function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  return d.toISOString().slice(0, 10);
}

function deriveParentKey(periodKey: string, granularity: TimeGranularity): string | null {
  if (granularity === "year") return "root";
  if (granularity === "quarter") return periodKey.slice(0, 4);
  if (granularity === "month") {
    const [year, month] = periodKey.split("-");
    const q = Math.ceil(Number(month) / 3);
    return `${year}-Q${q}`;
  }
  return periodKey.slice(0, 7);
}

type BackendTimeTrendRow = {
  period_key: string;
  period_label: string;
  period_granularity: string;
  stop_count: string | number | null;
  distinct_stations: string | number | null;
  distinct_services: string | number | null;
  cancelled_services: string | number | null;
  service_cancellation_rate: string | number | null;
  cancellation_rate: string | number | null;
  valid_arrival_observations: string | number | null;
  valid_departure_observations: string | number | null;
  average_arrival_delay: string | number | null;
  average_departure_delay: string | number | null;
  previous_period_average_departure_delay: string | number | null;
  previous_period_cancellation_rate: string | number | null;
};

/**
 * Service boundary for Time & Trend Analysis.
 * Calls `GET /api/time-trend` with validated date bounds and granularity.
 */
export async function fetchTimeTrend(filters: TimeTrendFilterState): Promise<TimeTrendData> {
  const { dateRange, granularity, selectedParentPeriodKey } = filters;
  const baseRange = resolvePresetRange(dateRange);
  let startDate = baseRange.startDate;
  let endDate = baseRange.endDate;
  let activeGranularity: TimeGranularity = granularity;

  const breadcrumbs: HierarchyBreadcrumb[] = [
    { granularity: "root", periodKey: "root", label: "All Years" },
  ];

  if (selectedParentPeriodKey) {
    if (/^\d{4}$/.test(selectedParentPeriodKey)) {
      const year = selectedParentPeriodKey;
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
      activeGranularity = "quarter";
      breadcrumbs.push({ granularity: "quarter", periodKey: year, label: year });
    } else if (/^\d{4}-Q([1-4])$/.test(selectedParentPeriodKey)) {
      const [year, qPart] = selectedParentPeriodKey.split("-Q");
      const q = Number(qPart);
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
      endDate = lastDayOfMonth(Number(year), endMonth);
      activeGranularity = "month";
      breadcrumbs.push(
        { granularity: "quarter", periodKey: year, label: year },
        {
          granularity: "month",
          periodKey: selectedParentPeriodKey,
          label: selectedParentPeriodKey.replace("-", " "),
        },
      );
    } else if (/^\d{4}-\d{2}$/.test(selectedParentPeriodKey)) {
      const [year, month] = selectedParentPeriodKey.split("-");
      const q = Math.ceil(Number(month) / 3);
      const quarterKey = `${year}-Q${q}`;
      startDate = `${selectedParentPeriodKey}-01`;
      endDate = lastDayOfMonth(Number(year), Number(month));
      activeGranularity = "day";
      breadcrumbs.push(
        { granularity: "quarter", periodKey: year, label: year },
        { granularity: "month", periodKey: quarterKey, label: `${year} Q${q}` },
        { granularity: "day", periodKey: selectedParentPeriodKey, label: selectedParentPeriodKey },
      );
    }
  }

  const params = new URLSearchParams({
    granularity: activeGranularity,
    start_date: startDate,
    end_date: endDate,
  });

  const rows = await fetchCachedJson<BackendTimeTrendRow[]>(`/api/time-trend?${params.toString()}`);

  const totalRow = rows.find((r) => r.period_granularity === "total");
  const periodRows = rows.filter((r) => r.period_granularity !== "total");

  const points: TimeTrendPoint[] = periodRows.map((r, idx, arr) => {
    const avgDelay = toNum(r.average_departure_delay);
    const validObs = toNum(r.valid_departure_observations) ?? 0;
    const cancelRatePct = toNum(r.service_cancellation_rate);
    const prevCancelRatePct = toNum(r.previous_period_cancellation_rate);
    const prevRow = idx > 0 ? arr[idx - 1] : null;

    return {
      periodKey: r.period_key,
      label: r.period_label,
      granularity: activeGranularity,
      parentPeriodKey: deriveParentKey(r.period_key, activeGranularity),
      distinctServiceCount: toNum(r.distinct_services) ?? 0,
      cancelledServiceCount: toNum(r.cancelled_services) ?? 0,
      cancellationRate: cancelRatePct !== null ? cancelRatePct / 100 : null,
      validDelayObservationCount: validObs,
      totalDepartureDelayMinutes: avgDelay !== null ? avgDelay * validObs : 0,
      averageDepartureDelayMinutes: avgDelay,
      previousPeriodAverageDelayMinutes: toNum(r.previous_period_average_departure_delay),
      previousPeriodCancellationRate: prevCancelRatePct !== null ? prevCancelRatePct / 100 : null,
      previousPeriodDistinctServices: prevRow ? toNum(prevRow.distinct_services) : null,
      previousPeriodValidObservations: prevRow ? toNum(prevRow.valid_departure_observations) : null,
    };
  });

  const scopeLabel =
    breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1].label : "All Available Data";

  const nextGranularityName =
    activeGranularity === "year"
      ? "Quarters"
      : activeGranularity === "quarter"
      ? "Months"
      : activeGranularity === "month"
      ? "Days"
      : null;

  const parentScopeDescription = nextGranularityName
    ? `Viewing ${nextGranularityName} in ${scopeLabel} — Click any period to drill down.`
    : `Viewing individual Days in ${scopeLabel} (Leaf Level).`;

  const totalAvgDelay = toNum(totalRow?.average_departure_delay);
  const totalValidObs = toNum(totalRow?.valid_departure_observations) ?? 0;
  const totalCancelRatePct = toNum(totalRow?.service_cancellation_rate);

  const summary: TimeTrendSummary = {
    scopeLabel,
    distinctServiceCount: toNum(totalRow?.distinct_services) ?? 0,
    cancelledServiceCount: toNum(totalRow?.cancelled_services) ?? 0,
    cancellationRate: totalCancelRatePct !== null ? totalCancelRatePct / 100 : null,
    validDelayObservationCount: totalValidObs,
    totalDepartureDelayMinutes: totalAvgDelay !== null ? totalAvgDelay * totalValidObs : 0,
    averageDepartureDelayMinutes: totalAvgDelay,
    previousPeriodAverageDelayMinutes: null,
    previousPeriodCancellationRate: null,
    previousPeriodDistinctServices: null,
    previousPeriodValidObservations: null,
  };

  return {
    breadcrumbs,
    scopeLabel,
    activeGranularity,
    parentScopeDescription,
    points,
    summary,
    dataTimestamp: new Date().toISOString(),
    isDemoData: false,
  };
}
