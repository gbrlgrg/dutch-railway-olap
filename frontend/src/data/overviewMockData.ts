/**
 * ILLUSTRATIVE MOCK DATA — not real Dutch railway statistics.
 * Operator and station names are placeholders for layout purposes only.
 * Replace via `src/services/overviewService.ts` when the API is available.
 */
import type {
  CancellationTrendPoint,
  DateRangePreset,
  DelayTrendPoint,
  Granularity,
  OperatorPerformance,
  OverviewData,
  OverviewQuery,
  StationDelay,
} from "@/types/overview";

/** Fixed demo anchor; deliberately not "today" so data is never implied current. */
export const DEMO_DATASET_END = "2024-12-31";
const DEMO_DATASET_START = "2023-01-01";
const DEMO_TIMESTAMP = "2025-01-02T06:00:00Z";

const DAY_MS = 86_400_000;

type DailyRecord = {
  date: Date;
  delaySumMinutes: number;
  validDelayObservationCount: number;
  distinctServiceCount: number;
  cancelledServiceCount: number;
};

/** Deterministic PRNG (mulberry32) so mock data is stable across renders. */
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

function parseUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function buildDailyRecords(): DailyRecord[] {
  const random = createRandom(20240101);
  const start = parseUtc(DEMO_DATASET_START).getTime();
  const end = parseUtc(DEMO_DATASET_END).getTime();
  const records: DailyRecord[] = [];
  for (let t = start; t <= end; t += DAY_MS) {
    const date = new Date(t);
    const dayOfYear = Math.floor((t - Date.UTC(date.getUTCFullYear(), 0, 1)) / DAY_MS);
    const weekday = date.getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const seasonal = 0.6 * Math.sin((2 * Math.PI * (dayOfYear - 300)) / 365);
    const averageDelay = Math.max(0.6, 2.4 + seasonal + (random() - 0.5) * 1.2 + (isWeekend ? -0.4 : 0.2));
    const distinctServiceCount = Math.round((isWeekend ? 3900 : 5200) + (random() - 0.5) * 300);
    const validDelayObservationCount = Math.round(distinctServiceCount * (11 + random() * 2));
    const cancellationRate = Math.max(0.004, 0.018 + seasonal * 0.01 + (random() - 0.5) * 0.012);
    records.push({
      date,
      delaySumMinutes: averageDelay * validDelayObservationCount,
      validDelayObservationCount,
      distinctServiceCount,
      cancelledServiceCount: Math.round(distinctServiceCount * cancellationRate),
    });
  }
  return records;
}

const DAILY_RECORDS = buildDailyRecords();

const RANGE_DAYS: Record<Exclude<DateRangePreset, "all-data">, number> = {
  "last-7-days": 7,
  "last-30-days": 30,
  "last-3-months": 91,
  "last-6-months": 182,
  "last-12-months": 365,
};

function selectRecords(range: DateRangePreset, offsetPeriods = 0): DailyRecord[] {
  if (range === "all-data") return offsetPeriods === 0 ? DAILY_RECORDS : [];
  const days = RANGE_DAYS[range];
  const endIndex = DAILY_RECORDS.length - days * offsetPeriods;
  return DAILY_RECORDS.slice(Math.max(0, endIndex - days), Math.max(0, endIndex));
}

function periodKey(date: Date, granularity: Granularity): string {
  const iso = date.toISOString();
  if (granularity === "year") return iso.slice(0, 4);
  if (granularity === "month") return iso.slice(0, 7);
  return iso.slice(0, 10);
}

function groupByPeriod(records: DailyRecord[], granularity: Granularity): Map<string, DailyRecord[]> {
  const groups = new Map<string, DailyRecord[]>();
  for (const record of records) {
    const key = periodKey(record.date, granularity);
    const group = groups.get(key);
    if (group) group.push(record);
    else groups.set(key, [record]);
  }
  return groups;
}

type Totals = {
  delaySumMinutes: number;
  validDelayObservationCount: number;
  distinctServiceCount: number;
  cancelledServiceCount: number;
};

/**
 * Mock simplification: daily distinct service counts are summed. With real data,
 * distinct services must be counted over the whole period, not per stop row.
 */
function totals(records: DailyRecord[]): Totals {
  return records.reduce<Totals>(
    (acc, r) => ({
      delaySumMinutes: acc.delaySumMinutes + r.delaySumMinutes,
      validDelayObservationCount: acc.validDelayObservationCount + r.validDelayObservationCount,
      distinctServiceCount: acc.distinctServiceCount + r.distinctServiceCount,
      cancelledServiceCount: acc.cancelledServiceCount + r.cancelledServiceCount,
    }),
    { delaySumMinutes: 0, validDelayObservationCount: 0, distinctServiceCount: 0, cancelledServiceCount: 0 },
  );
}

const safeRatio = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;

const OPERATORS = ["Operator A", "Operator B", "Operator C", "Operator D", "Operator E", "Operator F"];
const STATIONS = [
  "Station Noord",
  "Station Centraal",
  "Station Zuid",
  "Station Oost",
  "Station West",
  "Station Haven",
  "Station Brug",
  "Station Markt",
  "Station Polder",
  "Station Duin",
];

function rangeSeed(range: DateRangePreset): number {
  return Array.from(range).reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
}

function buildOperatorPerformance(range: DateRangePreset, overall: Totals): OperatorPerformance[] {
  const random = createRandom(rangeSeed(range));
  const shares = OPERATORS.map(() => 0.4 + random());
  const shareSum = shares.reduce((a, b) => a + b, 0);
  const baseDelay = safeRatio(overall.delaySumMinutes, overall.validDelayObservationCount) ?? 0;
  const baseCancel = safeRatio(overall.cancelledServiceCount, overall.distinctServiceCount) ?? 0;
  return OPERATORS.map((operator, i) => ({
    operator,
    averageDepartureDelayMinutes: Math.max(0.3, baseDelay * (0.6 + random() * 0.9)),
    distinctServiceCount: Math.round((overall.distinctServiceCount * shares[i]) / shareSum),
    cancellationRate: Math.max(0, baseCancel * (0.5 + random())),
  }));
}

function buildHighestDelayStations(range: DateRangePreset, overall: Totals): StationDelay[] {
  const random = createRandom(rangeSeed(range) + 99);
  const baseDelay = safeRatio(overall.delaySumMinutes, overall.validDelayObservationCount) ?? 0;
  const perStationObservations = overall.validDelayObservationCount / 380;
  return STATIONS.map((stationName) => ({
    stationName,
    averageDepartureDelayMinutes: baseDelay * (1.3 + random() * 1.4),
    validDelayObservationCount: Math.round(perStationObservations * (0.4 + random() * 1.6)),
  }))
    .sort((a, b) => (b.averageDepartureDelayMinutes ?? 0) - (a.averageDepartureDelayMinutes ?? 0))
    .slice(0, 8);
}

function delta(current: number | null, previous: number | null): number | null {
  return current !== null && previous !== null ? current - previous : null;
}

/** Builds the full Overview payload for a query from deterministic mock records. */
export function getOverviewMockData({ dateRange, granularity }: OverviewQuery): OverviewData {
  const current = selectRecords(dateRange);
  const previous = selectRecords(dateRange, 1);
  const cur = totals(current);
  const prev = totals(previous);
  const hasPrevious = previous.length > 0;

  const groups = groupByPeriod(current, granularity);
  const delayTrend: DelayTrendPoint[] = [];
  const cancellationTrend: CancellationTrendPoint[] = [];
  for (const [period, records] of groups) {
    const t = totals(records);
    delayTrend.push({
      period,
      averageDepartureDelayMinutes: safeRatio(t.delaySumMinutes, t.validDelayObservationCount),
      validDelayObservationCount: t.validDelayObservationCount,
    });
    cancellationTrend.push({
      period,
      cancelledServiceCount: t.cancelledServiceCount,
      distinctServiceCount: t.distinctServiceCount,
      cancellationRate: safeRatio(t.cancelledServiceCount, t.distinctServiceCount),
    });
  }

  const avgDelay = safeRatio(cur.delaySumMinutes, cur.validDelayObservationCount);
  const cancelRate = safeRatio(cur.cancelledServiceCount, cur.distinctServiceCount);
  const stationCount = current.length > 0 ? Math.min(397, 300 + Math.round(Math.log2(current.length + 1) * 10)) : 0;
  const prevStationCount = hasPrevious ? Math.min(397, 300 + Math.round(Math.log2(previous.length + 1) * 10) - 2) : null;

  return {
    metrics: {
      averageDepartureDelayMinutes: avgDelay,
      distinctServiceCount: cur.distinctServiceCount,
      cancellationRate: cancelRate,
      distinctStationCount: stationCount,
    },
    comparison: {
      averageDepartureDelayMinutesDelta: hasPrevious
        ? delta(avgDelay, safeRatio(prev.delaySumMinutes, prev.validDelayObservationCount))
        : null,
      distinctServiceCountDelta: hasPrevious ? cur.distinctServiceCount - prev.distinctServiceCount : null,
      cancellationRateDelta: hasPrevious
        ? delta(cancelRate, safeRatio(prev.cancelledServiceCount, prev.distinctServiceCount))
        : null,
      distinctStationCountDelta: prevStationCount !== null ? stationCount - prevStationCount : null,
    },
    delayTrend,
    cancellationTrend,
    operatorPerformance: current.length > 0 ? buildOperatorPerformance(dateRange, cur) : [],
    highestDelayStations: current.length > 0 ? buildHighestDelayStations(dateRange, cur) : [],
    dataTimestamp: DEMO_TIMESTAMP,
    isDemoData: true,
  };
}
