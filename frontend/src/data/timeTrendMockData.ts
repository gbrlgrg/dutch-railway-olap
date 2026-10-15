/**
 * Time & Trend Analysis OLAP Mock Data Generator.
 * Provides hierarchical Roll-up and Drill-down aggregates across:
 * Year -> Quarter -> Month -> Day
 *
 * Strict analytical correctness:
 * - Average delay = sum(delay) / count(valid_observations)
 * - Cancellation rate = sum(cancelled_services) / count(distinct_services)
 */

import type {
  DateRangePreset,
  HierarchyBreadcrumb,
  TimeGranularity,
  TimeTrendData,
  TimeTrendFilterState,
  TimeTrendPoint,
  TimeTrendSummary,
} from "@/types/timeTrend";

const DEMO_TIMESTAMP = "2025-01-02T06:00:00Z";
const START_DATE = "2023-01-01";
const END_DATE = "2024-12-31";
const DAY_MS = 86_400_000;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type DailyRecord = {
  date: Date;
  isoDate: string; // "YYYY-MM-DD"
  year: string;    // "2024"
  quarter: string; // "2024-Q3"
  month: string;   // "2024-08"
  delayMinutesSum: number;
  validDelayObservationCount: number;
  distinctServiceCount: number;
  cancelledServiceCount: number;
};

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateDailyRecords(): DailyRecord[] {
  const random = createRandom(20240101);
  const start = new Date(`${START_DATE}T00:00:00Z`).getTime();
  const end = new Date(`${END_DATE}T00:00:00Z`).getTime();
  const records: DailyRecord[] = [];

  for (let t = start; t <= end; t += DAY_MS) {
    const date = new Date(t);
    const isoDate = date.toISOString().slice(0, 10);
    const year = isoDate.slice(0, 4);
    const monthNum = Number(isoDate.slice(5, 7));
    const quarterNum = Math.ceil(monthNum / 3);
    const quarter = `${year}-Q${quarterNum}`;
    const month = isoDate.slice(0, 7);

    const dayOfYear = Math.floor((t - Date.UTC(date.getUTCFullYear(), 0, 1)) / DAY_MS);
    const weekday = date.getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const seasonal = 0.6 * Math.sin((2 * Math.PI * (dayOfYear - 300)) / 365);
    const averageDelay = Math.max(0.6, 2.4 + seasonal + (random() - 0.5) * 1.2 + (isWeekend ? -0.4 : 0.2));
    const distinctServiceCount = Math.round((isWeekend ? 3900 : 5200) + (random() - 0.5) * 300);
    const validDelayObservationCount = Math.round(distinctServiceCount * (11 + random() * 2));
    const cancellationRate = Math.max(0.004, 0.018 + seasonal * 0.01 + (random() - 0.5) * 0.012);
    const cancelledServiceCount = Math.round(distinctServiceCount * cancellationRate);

    records.push({
      date,
      isoDate,
      year,
      quarter,
      month,
      delayMinutesSum: averageDelay * validDelayObservationCount,
      validDelayObservationCount,
      distinctServiceCount,
      cancelledServiceCount,
    });
  }

  return records;
}

const ALL_DAILY_RECORDS = generateDailyRecords();

const RANGE_DAYS: Record<Exclude<DateRangePreset, "all-data">, number> = {
  "last-7-days": 7,
  "last-30-days": 30,
  "last-3-months": 91,
  "last-6-months": 182,
  "last-12-months": 365,
};

function filterByDateRange(records: DailyRecord[], range: DateRangePreset): DailyRecord[] {
  if (range === "all-data") return records;
  const days = RANGE_DAYS[range];
  return records.slice(Math.max(0, records.length - days));
}

type AggregatedBucket = {
  periodKey: string;
  label: string;
  granularity: TimeGranularity;
  parentPeriodKey: string | null;
  delayMinutesSum: number;
  validDelayObservationCount: number;
  distinctServiceCount: number;
  cancelledServiceCount: number;
};

function createBucket(
  periodKey: string,
  label: string,
  granularity: TimeGranularity,
  parentPeriodKey: string | null,
): AggregatedBucket {
  return {
    periodKey,
    label,
    granularity,
    parentPeriodKey,
    delayMinutesSum: 0,
    validDelayObservationCount: 0,
    distinctServiceCount: 0,
    cancelledServiceCount: 0,
  };
}

function formatQuarterLabel(quarterKey: string): string {
  // "2024-Q3" -> "2024 Q3"
  return quarterKey.replace("-", " ");
}

function formatMonthLabel(monthKey: string, style: "short" | "long" = "short"): string {
  // "2024-08" -> "Aug 2024" or "August 2024"
  const [year, month] = monthKey.split("-");
  const monthIdx = Number(month) - 1;
  const name = style === "long" ? MONTH_NAMES[monthIdx] : MONTH_NAMES_SHORT[monthIdx];
  return `${name} ${year}`;
}

function formatDayLabel(dayKey: string): string {
  // "2024-08-14" -> "14 Aug"
  const [, month, day] = dayKey.split("-");
  const monthIdx = Number(month) - 1;
  const monthShort = MONTH_NAMES_SHORT[monthIdx];
  return `${Number(day)} ${monthShort}`;
}

export function getTimeTrendMockData(filters: TimeTrendFilterState): TimeTrendData {
  const { dateRange, granularity, selectedParentPeriodKey } = filters;
  const dateScopedRecords = filterByDateRange(ALL_DAILY_RECORDS, dateRange);

  // Drill-down filtering based on selected parent period
  let activeRecords = dateScopedRecords;
  let activeGranularity: TimeGranularity = granularity;
  const breadcrumbs: HierarchyBreadcrumb[] = [
    { granularity: "root", periodKey: "root", label: "All Years" },
  ];

  if (selectedParentPeriodKey) {
    if (selectedParentPeriodKey.match(/^\d{4}$/)) {
      // Drilled into Year (e.g. "2024") -> Show Quarters
      activeRecords = dateScopedRecords.filter((r) => r.year === selectedParentPeriodKey);
      activeGranularity = "quarter";
      breadcrumbs.push({
        granularity: "quarter",
        periodKey: selectedParentPeriodKey,
        label: selectedParentPeriodKey,
      });
    } else if (selectedParentPeriodKey.match(/^\d{4}-Q\d$/)) {
      // Drilled into Quarter (e.g. "2024-Q3") -> Show Months
      const [year] = selectedParentPeriodKey.split("-");
      activeRecords = dateScopedRecords.filter((r) => r.quarter === selectedParentPeriodKey);
      activeGranularity = "month";
      breadcrumbs.push(
        { granularity: "quarter", periodKey: year, label: year },
        { granularity: "month", periodKey: selectedParentPeriodKey, label: formatQuarterLabel(selectedParentPeriodKey) },
      );
    } else if (selectedParentPeriodKey.match(/^\d{4}-\d{2}$/)) {
      // Drilled into Month (e.g. "2024-08") -> Show Days
      const [year, month] = selectedParentPeriodKey.split("-");
      const quarterNum = Math.ceil(Number(month) / 3);
      const quarterKey = `${year}-Q${quarterNum}`;
      activeRecords = dateScopedRecords.filter((r) => r.month === selectedParentPeriodKey);
      activeGranularity = "day";
      breadcrumbs.push(
        { granularity: "quarter", periodKey: year, label: year },
        { granularity: "month", periodKey: quarterKey, label: formatQuarterLabel(quarterKey) },
        { granularity: "day", periodKey: selectedParentPeriodKey, label: formatMonthLabel(selectedParentPeriodKey, "long") },
      );
    }
  }

  // Aggregate active records by the active child granularity
  const buckets = new Map<string, AggregatedBucket>();

  for (const record of activeRecords) {
    let key: string;
    let label: string;
    let parentKey: string | null;

    if (activeGranularity === "year") {
      key = record.year;
      label = record.year;
      parentKey = "root";
    } else if (activeGranularity === "quarter") {
      key = record.quarter;
      label = formatQuarterLabel(record.quarter);
      parentKey = record.year;
    } else if (activeGranularity === "month") {
      key = record.month;
      label = formatMonthLabel(record.month, "short");
      parentKey = record.quarter;
    } else {
      key = record.isoDate;
      label = formatDayLabel(record.isoDate);
      parentKey = record.month;
    }

    let b = buckets.get(key);
    if (!b) {
      b = createBucket(key, label, activeGranularity, parentKey);
      buckets.set(key, b);
    }

    b.delayMinutesSum += record.delayMinutesSum;
    b.validDelayObservationCount += record.validDelayObservationCount;
    b.distinctServiceCount += record.distinctServiceCount;
    b.cancelledServiceCount += record.cancelledServiceCount;
  }

  // Convert buckets into TimeTrendPoint array
  const points: TimeTrendPoint[] = Array.from(buckets.values()).map((b, idx, arr) => {
    const avgDelay = b.validDelayObservationCount > 0 ? b.delayMinutesSum / b.validDelayObservationCount : null;
    const cancelRate = b.distinctServiceCount > 0 ? b.cancelledServiceCount / b.distinctServiceCount : null;

    // Previous equivalent period comparison (mock estimate: previous item in list or offset)
    const prev = idx > 0 ? arr[idx - 1] : null;
    const prevAvgDelay = prev && prev.validDelayObservationCount > 0
      ? prev.delayMinutesSum / prev.validDelayObservationCount
      : avgDelay !== null ? avgDelay * (0.96 + ((idx % 3) * 0.03)) : null;

    const prevCancelRate = prev && prev.distinctServiceCount > 0
      ? prev.cancelledServiceCount / prev.distinctServiceCount
      : cancelRate !== null ? cancelRate * (0.95 + ((idx % 4) * 0.02)) : null;

    return {
      periodKey: b.periodKey,
      label: b.label,
      granularity: b.granularity,
      parentPeriodKey: b.parentPeriodKey,
      distinctServiceCount: b.distinctServiceCount,
      cancelledServiceCount: b.cancelledServiceCount,
      cancellationRate: cancelRate,
      validDelayObservationCount: b.validDelayObservationCount,
      totalDepartureDelayMinutes: b.delayMinutesSum,
      averageDepartureDelayMinutes: avgDelay,
      previousPeriodAverageDelayMinutes: prevAvgDelay,
      previousPeriodCancellationRate: prevCancelRate,
      previousPeriodDistinctServices: prev ? prev.distinctServiceCount : null,
      previousPeriodValidObservations: prev ? prev.validDelayObservationCount : null,
    };
  });

  // Calculate rolled-up summary across all active records
  let totalDelayMinutes = 0;
  let totalObservations = 0;
  let totalServices = 0;
  let totalCancelled = 0;

  for (const r of activeRecords) {
    totalDelayMinutes += r.delayMinutesSum;
    totalObservations += r.validDelayObservationCount;
    totalServices += r.distinctServiceCount;
    totalCancelled += r.cancelledServiceCount;
  }

  const rolledUpAvgDelay = totalObservations > 0 ? totalDelayMinutes / totalObservations : null;
  const rolledUpCancelRate = totalServices > 0 ? totalCancelled / totalServices : null;

  // Comparison baseline for rolled-up summary (e.g. -0.2 min delay, +0.1% cancel)
  const prevSummaryDelay = rolledUpAvgDelay !== null ? rolledUpAvgDelay * 1.05 : null;
  const prevSummaryCancel = rolledUpCancelRate !== null ? rolledUpCancelRate * 0.94 : null;
  const prevSummaryServices = Math.round(totalServices * 0.98);
  const prevSummaryObs = Math.round(totalObservations * 0.98);

  const scopeLabel = breadcrumbs.length > 1
    ? breadcrumbs[breadcrumbs.length - 1].label
    : "All Available Data";

  const nextGranularityName =
    activeGranularity === "year" ? "Quarters"
    : activeGranularity === "quarter" ? "Months"
    : activeGranularity === "month" ? "Days"
    : null;

  const parentScopeDescription = nextGranularityName
    ? `Viewing ${nextGranularityName} in ${scopeLabel} — Click any period to drill down.`
    : `Viewing individual Days in ${scopeLabel} (Leaf Level).`;

  const summary: TimeTrendSummary = {
    scopeLabel,
    distinctServiceCount: totalServices,
    cancelledServiceCount: totalCancelled,
    cancellationRate: rolledUpCancelRate,
    validDelayObservationCount: totalObservations,
    totalDepartureDelayMinutes: totalDelayMinutes,
    averageDepartureDelayMinutes: rolledUpAvgDelay,
    previousPeriodAverageDelayMinutes: prevSummaryDelay,
    previousPeriodCancellationRate: prevSummaryCancel,
    previousPeriodDistinctServices: prevSummaryServices,
    previousPeriodValidObservations: prevSummaryObs,
  };

  return {
    breadcrumbs,
    scopeLabel,
    activeGranularity,
    parentScopeDescription,
    points,
    summary,
    dataTimestamp: DEMO_TIMESTAMP,
    isDemoData: true,
  };
}
