import type {
  CancellationTrendPoint,
  DateRangePreset,
  DelayTrendPoint,
  OperatorPerformance,
  OverviewData,
  OverviewQuery,
  StationDelay,
} from "@/types/overview";
import preAggregatedData from "@/data/preAggregatedOlapData.json";

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

function resolveDateRange(preset: DateRangePreset): { startDate: string; endDate: string } {
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

function delta(cur: number | null, prev: number | null): number | null {
  return cur !== null && prev !== null ? cur - prev : null;
}

type KpiPeriodRow = {
  period: string;
  average_departure_delay: string | number | null;
  distinct_services: string | number | null;
  cancelled_services: string | number | null;
  stations_observed: string | number | null;
  cancellation_rate: string | number | null;
};

type KpiResponse = {
  current?: KpiPeriodRow;
  previous?: KpiPeriodRow;
};

type TimeTrendRow = {
  period_key: string;
  period_label: string;
  period_granularity: string;
  distinct_services: string | number | null;
  cancelled_services: string | number | null;
  service_cancellation_rate: string | number | null;
  valid_departure_observations: string | number | null;
  average_departure_delay: string | number | null;
};

type SliceRow = {
  group_value: string | null;
  average_departure_delay: string | number | null;
  distinct_services: string | number | null;
  cancellation_rate: string | number | null;
};

type StationDelayRow = {
  station_code: string;
  station_name: string | null;
  average_arrival_delay: string | number | null;
  delayed_arrivals: string | number | null;
  stop_count: string | number | null;
};

const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildTimeTrendFromPreAggregated(urlObj: URL): TimeTrendRow[] {
  const granularity = urlObj.searchParams.get("granularity") ?? "month";
  const startDate = urlObj.searchParams.get("start_date");
  const endDate = urlObj.searchParams.get("end_date");

  const daily = preAggregatedData.dailySummary.filter((d) => {
    if (startDate && d.full_date < startDate) return false;
    if (endDate && d.full_date > endDate) return false;
    return true;
  });

  type Bucket = {
    period_key: string;
    period_label: string;
    period_granularity: string;
    stop_count: number;
    distinct_stations: number;
    distinct_services: number;
    cancelled_services: number;
    known_services: number;
    cancelled_stops: number;
    known_departure_stops: number;
    valid_arrival_observations: number;
    valid_departure_observations: number;
    arrival_delay_sum: number;
    departure_delay_sum: number;
  };

  const makeBucket = (key: string, label: string, gran: string): Bucket => ({
    period_key: key,
    period_label: label,
    period_granularity: gran,
    stop_count: 0,
    distinct_stations: 0,
    distinct_services: 0,
    cancelled_services: 0,
    known_services: 0,
    cancelled_stops: 0,
    known_departure_stops: 0,
    valid_arrival_observations: 0,
    valid_departure_observations: 0,
    arrival_delay_sum: 0,
    departure_delay_sum: 0,
  });

  const addDay = (b: Bucket, d: (typeof daily)[number]) => {
    b.stop_count += Number(d.stop_count ?? 0);
    b.distinct_stations = Math.max(b.distinct_stations, Number(d.distinct_stations ?? 0));
    b.distinct_services += Number(d.distinct_services ?? 0);
    b.cancelled_services += Number(d.cancelled_services ?? 0);
    b.known_services += Number(d.known_services ?? 0);
    b.cancelled_stops += Number(d.cancelled_stops ?? 0);
    b.known_departure_stops += Number(d.known_departure_stops ?? 0);
    b.valid_arrival_observations += Number(d.valid_arrival_observations ?? 0);
    b.valid_departure_observations += Number(d.valid_departure_observations ?? 0);
    b.arrival_delay_sum += Number(d.arrival_delay_sum ?? 0);
    b.departure_delay_sum += Number(d.departure_delay_sum ?? 0);
  };

  const buckets = new Map<string, Bucket>();
  const totalBucket = makeBucket("all", "All selected dates", "total");

  for (const d of daily) {
    addDay(totalBucket, d);
    let key: string;
    let label: string;
    if (granularity === "year") {
      key = String(d.year_number);
      label = String(d.year_number);
    } else if (granularity === "quarter") {
      key = `${d.year_number}-Q${d.quarter_number}`;
      label = `${d.year_number} Q${d.quarter_number}`;
    } else if (granularity === "month") {
      key = `${d.year_number}-${String(d.month_number).padStart(2, "0")}`;
      label = `${MONTH_NAMES_FULL[d.month_number - 1]} ${d.year_number}`;
    } else {
      key = d.full_date;
      label = `${MONTH_NAMES_FULL[d.month_number - 1]} ${String(d.day_number).padStart(2, "0")}, ${d.year_number}`;
    }
    let b = buckets.get(key);
    if (!b) {
      b = makeBucket(key, label, granularity);
      buckets.set(key, b);
    }
    addDay(b, d);
  }

  const toRow = (b: Bucket, prev: Bucket | null): TimeTrendRow & Record<string, unknown> => {
    const avgArr = b.valid_arrival_observations > 0
      ? Number((b.arrival_delay_sum / b.valid_arrival_observations).toFixed(2))
      : null;
    const avgDep = b.valid_departure_observations > 0
      ? Number((b.departure_delay_sum / b.valid_departure_observations).toFixed(2))
      : null;
    const prevAvgDep = prev && prev.valid_departure_observations > 0
      ? Number((prev.departure_delay_sum / prev.valid_departure_observations).toFixed(2))
      : null;
    const prevCancelRate = prev && prev.known_departure_stops > 0
      ? Number(((100 * prev.cancelled_stops) / prev.known_departure_stops).toFixed(2))
      : null;

    return {
      period_key: b.period_key,
      period_label: b.period_label,
      period_granularity: b.period_granularity,
      stop_count: b.stop_count,
      distinct_stations: b.distinct_stations,
      distinct_services: b.distinct_services,
      cancelled_services: b.cancelled_services,
      service_cancellation_rate: b.known_services > 0
        ? Number(((100 * b.cancelled_services) / b.known_services).toFixed(2))
        : null,
      cancellation_rate: b.known_departure_stops > 0
        ? Number(((100 * b.cancelled_stops) / b.known_departure_stops).toFixed(2))
        : null,
      valid_arrival_observations: b.valid_arrival_observations,
      valid_departure_observations: b.valid_departure_observations,
      average_arrival_delay: avgArr,
      average_departure_delay: avgDep,
      previous_period_average_departure_delay: prevAvgDep,
      previous_period_cancellation_rate: prevCancelRate,
    };
  };

  const ordered = Array.from(buckets.values());
  const rows: TimeTrendRow[] = ordered.map((b, i) => toRow(b, i > 0 ? ordered[i - 1] : null));
  rows.push(toRow(totalBucket, null));
  return rows;
}

type CubeEntry = (typeof preAggregatedData.monthlyCube)[number];

function filterCube(urlObj: URL): CubeEntry[] {
  const startDate = urlObj.searchParams.get("start_date");
  const endDate = urlObj.searchParams.get("end_date");
  const operatorParam = urlObj.searchParams.get("operator") ?? urlObj.searchParams.get("operators");
  const serviceTypeParam = urlObj.searchParams.get("service_type") ?? urlObj.searchParams.get("service_types");

  const operators = operatorParam ? operatorParam.split(",").map((s) => s.trim()).filter(Boolean) : null;
  const serviceTypes = serviceTypeParam ? serviceTypeParam.split(",").map((s) => s.trim()).filter(Boolean) : null;

  const startMonth = startDate ? startDate.slice(0, 7) : null;
  const endMonth = endDate ? endDate.slice(0, 7) : null;

  return preAggregatedData.monthlyCube.filter((c) => {
    if (startMonth && c.month_key < startMonth) return false;
    if (endMonth && c.month_key > endMonth) return false;
    if (operators && operators.length > 0 && !operators.includes(c.company)) return false;
    if (serviceTypes && serviceTypes.length > 0 && !serviceTypes.includes(c.service_type)) return false;
    return true;
  });
}

function buildPivotFromPreAggregated(urlObj: URL): Record<string, unknown>[] {
  const rowDim = urlObj.searchParams.get("row_dimension") ?? "operator";
  const colDim = urlObj.searchParams.get("column_dimension") ?? "month";
  const filtered = filterCube(urlObj);

  type Acc = {
    row_key: string | null;
    row_label: string;
    column_key: string | null;
    column_label: string;
    grouping_level: "cell" | "row_total" | "column_total" | "grand_total";
    stop_count: number;
    distinct_services: number;
    cancelled_stops: number;
    known_departure_stops: number;
    valid_observations: number;
    departure_delay_sum: number;
  };

  const makeAcc = (
    rk: string | null,
    rl: string,
    ck: string | null,
    cl: string,
    gl: Acc["grouping_level"],
  ): Acc => ({
    row_key: rk,
    row_label: rl,
    column_key: ck,
    column_label: cl,
    grouping_level: gl,
    stop_count: 0,
    distinct_services: 0,
    cancelled_stops: 0,
    known_departure_stops: 0,
    valid_observations: 0,
    departure_delay_sum: 0,
  });

  const addCube = (a: Acc, c: CubeEntry) => {
    a.stop_count += Number(c.stop_count ?? 0);
    a.distinct_services += Number(c.distinct_services ?? 0);
    a.cancelled_stops += Number(c.cancelled_stops ?? 0);
    a.known_departure_stops += Number(c.known_departure_stops ?? 0);
    a.valid_observations += Number(c.valid_observations ?? 0);
    a.departure_delay_sum += Number(c.departure_delay_sum ?? 0);
  };

  const cells = new Map<string, Acc>();
  const rowTotals = new Map<string, Acc>();
  const colTotals = new Map<string, Acc>();
  const grandTotal = makeAcc(null, "Grand Total", null, "Total", "grand_total");

  for (const c of filtered) {
    if (rowDim === "station" && c.station_code === "OTHER") continue;

    const rk = rowDim === "operator" ? c.company : c.station_code;
    const rl = rowDim === "operator" ? c.company : (c.station_name ?? c.station_code);

    let ck: string;
    let cl: string;
    if (colDim === "month") {
      ck = c.month_key;
      cl = c.month_label;
    } else if (colDim === "quarter") {
      ck = `${c.year_number}-Q${c.quarter_number}`;
      cl = `${c.year_number} Q${c.quarter_number}`;
    } else {
      ck = c.service_type;
      cl = c.service_type;
    }

    const cellKey = `${rk}|||${ck}`;
    let cell = cells.get(cellKey);
    if (!cell) {
      cell = makeAcc(rk, rl, ck, cl, "cell");
      cells.set(cellKey, cell);
    }
    addCube(cell, c);

    let rt = rowTotals.get(rk);
    if (!rt) {
      rt = makeAcc(rk, rl, null, "Total", "row_total");
      rowTotals.set(rk, rt);
    }
    addCube(rt, c);

    let ct = colTotals.get(ck);
    if (!ct) {
      ct = makeAcc(null, "Grand Total", ck, cl, "column_total");
      colTotals.set(ck, ct);
    }
    addCube(ct, c);

    addCube(grandTotal, c);
  }

  const finalize = (a: Acc) => ({
    row_key: a.row_key,
    row_label: a.row_label,
    column_key: a.column_key,
    column_label: a.column_label,
    grouping_level: a.grouping_level,
    stop_count: a.stop_count,
    distinct_services: a.distinct_services,
    average_departure_delay: a.valid_observations > 0
      ? Number((a.departure_delay_sum / a.valid_observations).toFixed(2))
      : null,
    cancelled_stops: a.cancelled_stops,
    known_departure_stops: a.known_departure_stops,
    cancellation_rate: a.known_departure_stops > 0
      ? Number(((100 * a.cancelled_stops) / a.known_departure_stops).toFixed(2))
      : null,
  });

  return [
    ...Array.from(cells.values()).map(finalize),
    ...Array.from(rowTotals.values()).map(finalize),
    ...Array.from(colTotals.values()).map(finalize),
    finalize(grandTotal),
  ];
}

function buildDiceFromPreAggregated(urlObj: URL): Record<string, unknown>[] {
  const filtered = filterCube(urlObj);

  type DiceAcc = {
    operator: string | null;
    service_type: string | null;
    station_code: string | null;
    station_name: string | null;
    grouping_level: "Station Detail" | "Operator-Service Summary" | "Operator Summary" | "Grand Total";
    total_stops: number;
    distinct_services: number;
    known_services: number;
    cancelled_services: number;
    cancelled_departures: number;
    known_departures: number;
    valid_observations: number;
    departure_delay_sum: number;
  };

  const makeDice = (
    op: string | null,
    st: string | null,
    sc: string | null,
    sn: string | null,
    gl: DiceAcc["grouping_level"],
  ): DiceAcc => ({
    operator: op,
    service_type: st,
    station_code: sc,
    station_name: sn,
    grouping_level: gl,
    total_stops: 0,
    distinct_services: 0,
    known_services: 0,
    cancelled_services: 0,
    cancelled_departures: 0,
    known_departures: 0,
    valid_observations: 0,
    departure_delay_sum: 0,
  });

  const add = (a: DiceAcc, c: CubeEntry) => {
    a.total_stops += Number(c.stop_count ?? 0);
    a.distinct_services += Number(c.distinct_services ?? 0);
    a.known_services += Number(c.known_services ?? 0);
    a.cancelled_services += Number(c.cancelled_services ?? 0);
    a.cancelled_departures += Number(c.cancelled_stops ?? 0);
    a.known_departures += Number(c.known_departure_stops ?? 0);
    a.valid_observations += Number(c.valid_observations ?? 0);
    a.departure_delay_sum += Number(c.departure_delay_sum ?? 0);
  };

  const stationMap = new Map<string, DiceAcc>();
  const opSvcMap = new Map<string, DiceAcc>();
  const opMap = new Map<string, DiceAcc>();
  const grand = makeDice(null, null, null, null, "Grand Total");

  for (const c of filtered) {
    add(grand, c);

    let opAcc = opMap.get(c.company);
    if (!opAcc) {
      opAcc = makeDice(c.company, null, null, null, "Operator Summary");
      opMap.set(c.company, opAcc);
    }
    add(opAcc, c);

    const opSvcKey = `${c.company}|||${c.service_type}`;
    let opSvcAcc = opSvcMap.get(opSvcKey);
    if (!opSvcAcc) {
      opSvcAcc = makeDice(c.company, c.service_type, null, null, "Operator-Service Summary");
      opSvcMap.set(opSvcKey, opSvcAcc);
    }
    add(opSvcAcc, c);

    if (c.station_code !== "OTHER") {
      const stKey = `${c.company}|||${c.service_type}|||${c.station_code}`;
      let stAcc = stationMap.get(stKey);
      if (!stAcc) {
        stAcc = makeDice(c.company, c.service_type, c.station_code, c.station_name, "Station Detail");
        stationMap.set(stKey, stAcc);
      }
      add(stAcc, c);
    }
  }

  const finalize = (a: DiceAcc) => ({
    operator: a.operator,
    service_type: a.service_type,
    station_code: a.station_code,
    station_name: a.station_name,
    grouping_level: a.grouping_level,
    total_stops: a.total_stops,
    distinct_services: a.distinct_services,
    known_services: a.known_services,
    cancelled_services: a.cancelled_services,
    service_cancellation_rate: a.known_services > 0 ? Number(((100 * a.cancelled_services) / a.known_services).toFixed(2)) : null,
    cancelled_departures: a.cancelled_departures,
    known_departures: a.known_departures,
    cancellation_rate: a.known_departures > 0 ? Number(((100 * a.cancelled_departures) / a.known_departures).toFixed(2)) : null,
    departure_cancellation_rate: a.known_departures > 0 ? Number(((100 * a.cancelled_departures) / a.known_departures).toFixed(2)) : null,
    average_departure_delay: a.valid_observations > 0 ? Number((a.departure_delay_sum / a.valid_observations).toFixed(2)) : null,
    valid_observations: a.valid_observations,
  });

  return [
    ...Array.from(stationMap.values()).map(finalize),
    ...Array.from(opSvcMap.values()).map(finalize),
    ...Array.from(opMap.values()).map(finalize),
    finalize(grand),
  ];
}

/**
 * Option A: Serves the SQL-extracted pre-aggregated data from
 * `preAggregatedOlapData.json` in 0ms without altering `backend/src/endpoints.ts`.
 */
export async function fetchCachedJson<T>(url: string): Promise<T> {
  const urlObj = new URL(url, "http://localhost");
  const path = urlObj.pathname;

  if (path === "/api/overview-kpis") return preAggregatedData.overviewKpis as unknown as T;
  if (path === "/api/station-delays") return preAggregatedData.stationDelays as unknown as T;
  if (path === "/api/peak-delays") return preAggregatedData.peakDelays as unknown as T;
  if (path === "/api/olap-slice") return preAggregatedData.olapSlice as unknown as T;
  if (path === "/api/time-trend") return buildTimeTrendFromPreAggregated(urlObj) as unknown as T;
  if (path === "/api/olap-pivot") return buildPivotFromPreAggregated(urlObj) as unknown as T;
  if (path === "/api/olap-dice") return buildDiceFromPreAggregated(urlObj) as unknown as T;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return (await response.json()) as T;
}

const fetchJson = fetchCachedJson;

/**
 * Single data-access point for the Overview page.
 */
export async function fetchOverview(query: OverviewQuery): Promise<OverviewData> {
  const { startDate, endDate } = resolveDateRange(query.dateRange);
  const trendParams = new URLSearchParams({
    granularity: query.granularity,
    start_date: startDate,
    end_date: endDate,
  });

  const [kpis, trendRows, sliceRows, stationRows] = await Promise.all([
    fetchJson<KpiResponse>("/api/overview-kpis"),
    fetchJson<TimeTrendRow[]>(`/api/time-trend?${trendParams.toString()}`),
    fetchJson<SliceRow[]>("/api/olap-slice"),
    fetchJson<StationDelayRow[]>("/api/station-delays"),
  ]);

  const cur = kpis.current;
  const prev = kpis.previous;

  const curAvgDelay = toNum(cur?.average_departure_delay);
  const prevAvgDelay = toNum(prev?.average_departure_delay);

  const curServices = toNum(cur?.distinct_services) ?? 0;
  const prevServices = toNum(prev?.distinct_services);

  const curCancelRatePct = toNum(cur?.cancellation_rate);
  const prevCancelRatePct = toNum(prev?.cancellation_rate);
  const curCancelRate = curCancelRatePct !== null ? curCancelRatePct / 100 : null;
  const prevCancelRate = prevCancelRatePct !== null ? prevCancelRatePct / 100 : null;

  const curStations = toNum(cur?.stations_observed) ?? 0;
  const prevStations = toNum(prev?.stations_observed);

  const periodRows = trendRows.filter((r) => r.period_granularity !== "total");

  const delayTrend: DelayTrendPoint[] = periodRows.map((r) => ({
    period: r.period_key,
    averageDepartureDelayMinutes: toNum(r.average_departure_delay),
    validDelayObservationCount: toNum(r.valid_departure_observations) ?? 0,
  }));

  const cancellationTrend: CancellationTrendPoint[] = periodRows.map((r) => {
    const ratePct = toNum(r.service_cancellation_rate);
    return {
      period: r.period_key,
      cancelledServiceCount: toNum(r.cancelled_services) ?? 0,
      distinctServiceCount: toNum(r.distinct_services) ?? 0,
      cancellationRate: ratePct !== null ? ratePct / 100 : null,
    };
  });

  const operatorPerformance: OperatorPerformance[] = sliceRows.slice(0, 8).map((r) => {
    const ratePct = toNum(r.cancellation_rate);
    return {
      operator: r.group_value ?? "(Unknown)",
      averageDepartureDelayMinutes: toNum(r.average_departure_delay),
      distinctServiceCount: toNum(r.distinct_services) ?? 0,
      cancellationRate: ratePct !== null ? ratePct / 100 : null,
    };
  });

  const highestDelayStations: StationDelay[] = stationRows.map((r) => ({
    stationName: r.station_name ?? r.station_code,
    averageDepartureDelayMinutes: toNum(r.average_arrival_delay),
    validDelayObservationCount: toNum(r.stop_count) ?? 0,
  }));

  return {
    metrics: {
      averageDepartureDelayMinutes: curAvgDelay,
      distinctServiceCount: curServices,
      cancellationRate: curCancelRate,
      distinctStationCount: curStations,
    },
    comparison: {
      averageDepartureDelayMinutesDelta: delta(curAvgDelay, prevAvgDelay),
      distinctServiceCountDelta: prevServices !== null ? curServices - prevServices : null,
      cancellationRateDelta: delta(curCancelRate, prevCancelRate),
      distinctStationCountDelta: prevStations !== null ? curStations - prevStations : null,
    },
    delayTrend,
    cancellationTrend,
    operatorPerformance,
    highestDelayStations,
    dataTimestamp: new Date().toISOString(),
    isDemoData: false,
  };
}
