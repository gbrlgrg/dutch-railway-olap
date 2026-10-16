import { getDimensionLabel, getDimensionName } from "@/data/olapExplorerMockData";
import { fetchCachedJson } from "@/services/overviewService";
import type {
  AggregatedMeasureValues,
  GroupedTableResult,
  GroupedTableRow,
  OlapDimension,
  OlapMeasure,
  OlapOperationBadgeType,
  OlapQueryConfig,
  OlapQueryResult,
  OlapSortOption,
  PivotTableResult,
  PivotTableRow,
} from "@/types/olapExplorer";

function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function emptyMeasures(): AggregatedMeasureValues {
  return {
    distinctServiceCount: 0,
    cancelledServiceCount: 0,
    cancellationRate: null,
    validDelayObservationCount: 0,
    totalDepartureDelayMinutes: 0,
    averageDepartureDelayMinutes: null,
  };
}

function detectActiveBadges(config: OlapQueryConfig): OlapOperationBadgeType[] {
  const badges: OlapOperationBadgeType[] = [];
  const { filters, columnDimension } = config;

  const activeFilterEntries: { dim: string; vals: string[] }[] = [];
  if (filters.years.length > 0) activeFilterEntries.push({ dim: "Year", vals: filters.years });
  if (filters.quarters.length > 0) activeFilterEntries.push({ dim: "Quarter", vals: filters.quarters });
  if (filters.months.length > 0) activeFilterEntries.push({ dim: "Month", vals: filters.months });
  if (filters.operators.length > 0) activeFilterEntries.push({ dim: "Operator", vals: filters.operators });
  if (filters.stations.length > 0) activeFilterEntries.push({ dim: "Station", vals: filters.stations });
  if (filters.serviceTypes.length > 0) activeFilterEntries.push({ dim: "Service Type", vals: filters.serviceTypes });

  if (activeFilterEntries.length === 1 && activeFilterEntries[0].vals.length === 1) {
    badges.push({
      type: "SLICE",
      label: `Slice: ${activeFilterEntries[0].dim} = ${activeFilterEntries[0].vals[0]}`,
      description: "Cube sliced to a single dimension plane.",
    });
  } else if (activeFilterEntries.length >= 1) {
    const summary = activeFilterEntries.map((e) => `${e.dim} (${e.vals.length})`).join(" × ");
    badges.push({
      type: "DICE",
      label: `Dice: ${summary}`,
      description: "Sub-cube isolated across multi-dimensional criteria.",
    });
  }

  if (columnDimension) {
    badges.push({
      type: "PIVOT",
      label: `Pivot: ${getDimensionName(config.rowDimension)} × ${getDimensionName(columnDimension)}`,
      description: "Cross-tabulation matrix reorienting dimensions onto rows and columns.",
    });
  }

  return badges;
}

function resolveFilterDates(config: OlapQueryConfig): { startDate?: string; endDate?: string } {
  const { years, quarters, months } = config.filters;
  if (months.length > 0) {
    const sorted = [...months].sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const [y, m] = last.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return { startDate: `${first}-01`, endDate: lastDay };
  }
  if (quarters.length > 0) {
    const sorted = [...quarters].sort();
    const [y1, q1] = sorted[0].split("-Q").map(Number);
    const [y2, q2] = sorted[sorted.length - 1].split("-Q").map(Number);
    const startMonth = String((q1 - 1) * 3 + 1).padStart(2, "0");
    const endMonth = q2 * 3;
    const lastDay = new Date(Date.UTC(y2, endMonth, 0)).toISOString().slice(0, 10);
    return { startDate: `${y1}-${startMonth}-01`, endDate: lastDay };
  }
  if (years.length > 0) {
    const sorted = [...years].sort();
    return {
      startDate: `${sorted[0]}-01-01`,
      endDate: `${sorted[sorted.length - 1]}-12-31`,
    };
  }
  return { startDate: "2025-01-01", endDate: "2025-12-31" };
}

function sortGroupedRows(rows: GroupedTableRow[], sortBy: OlapSortOption, measure: OlapMeasure): void {
  rows.sort((a, b) => {
    if (sortBy === "dimension") return a.groupLabel.localeCompare(b.groupLabel);
    const valA = (a.values[measure] as number | null) ?? -Infinity;
    const valB = (b.values[measure] as number | null) ?? -Infinity;
    return sortBy === "measure-desc" ? valB - valA : valA - valB;
  });
}

function sortPivotRows(rows: PivotTableRow[], sortBy: OlapSortOption, measure: OlapMeasure): void {
  rows.sort((a, b) => {
    if (sortBy === "dimension") return a.rowLabel.localeCompare(b.rowLabel);
    const valA = (a.rowTotal[measure] as number | null) ?? -Infinity;
    const valB = (b.rowTotal[measure] as number | null) ?? -Infinity;
    return sortBy === "measure-desc" ? valB - valA : valA - valB;
  });
}

type BackendPivotRow = {
  row_key: string | null;
  row_label: string;
  column_key: string | null;
  column_label: string;
  grouping_level: "cell" | "row_total" | "column_total" | "grand_total";
  stop_count: string | number | null;
  distinct_services: string | number | null;
  average_departure_delay: string | number | null;
  cancelled_stops: string | number | null;
  known_departure_stops: string | number | null;
  cancellation_rate: string | number | null;
};

type BackendDiceRow = {
  operator: string | null;
  service_type: string | null;
  station_key: string | number | null;
  station_code: string | null;
  station_name: string | null;
  grouping_level: "Grand Total" | "Operator Summary" | "Operator-Service Summary" | "Station Detail";
  total_stops: string | number | null;
  distinct_services: string | number | null;
  cancelled_services: string | number | null;
  service_cancellation_rate: string | number | null;
  cancellation_rate: string | number | null;
  average_departure_delay: string | number | null;
  valid_observations: string | number | null;
};

type BackendSliceRow = {
  group_value: string | null;
  average_departure_delay: string | number | null;
  distinct_services: string | number | null;
  cancelled_services: string | number | null;
  valid_observations: string | number | null;
  cancellation_rate: string | number | null;
};

type BackendTimeTrendRow = {
  period_key: string;
  period_label: string;
  period_granularity: string;
  distinct_services: string | number | null;
  cancelled_services: string | number | null;
  service_cancellation_rate: string | number | null;
  valid_departure_observations: string | number | null;
  average_departure_delay: string | number | null;
};

function mapPivotMeasures(row: BackendPivotRow): AggregatedMeasureValues {
  const distinctServices = toNum(row.distinct_services) ?? 0;
  const avgDelay = toNum(row.average_departure_delay);
  const validObs = toNum(row.known_departure_stops) ?? toNum(row.stop_count) ?? 0;
  const cancelRatePct = toNum(row.cancellation_rate);
  const cancelRate = cancelRatePct !== null ? cancelRatePct / 100 : null;
  const cancelledCount =
    cancelRate !== null ? Math.round(distinctServices * cancelRate) : toNum(row.cancelled_stops) ?? 0;

  return {
    distinctServiceCount: distinctServices,
    cancelledServiceCount: cancelledCount,
    cancellationRate: cancelRate,
    validDelayObservationCount: validObs,
    totalDepartureDelayMinutes: avgDelay !== null ? avgDelay * validObs : 0,
    averageDepartureDelayMinutes: avgDelay,
  };
}

function mapDiceMeasures(row: BackendDiceRow): AggregatedMeasureValues {
  const distinctServices = toNum(row.distinct_services) ?? 0;
  const cancelledServices = toNum(row.cancelled_services) ?? 0;
  const validObs = toNum(row.valid_observations) ?? 0;
  const avgDelay = toNum(row.average_departure_delay);
  const cancelRatePct = toNum(row.service_cancellation_rate) ?? toNum(row.cancellation_rate);

  return {
    distinctServiceCount: distinctServices,
    cancelledServiceCount: cancelledServices,
    cancellationRate: cancelRatePct !== null ? cancelRatePct / 100 : null,
    validDelayObservationCount: validObs,
    totalDepartureDelayMinutes: avgDelay !== null ? avgDelay * validObs : 0,
    averageDepartureDelayMinutes: avgDelay,
  };
}

function toBackendPivotRowDim(dim: OlapDimension): "operator" | "station" {
  return dim === "station" ? "station" : "operator";
}

function toBackendPivotColDim(dim: OlapDimension): "month" | "quarter" | "service_type" {
  if (dim === "quarter") return "quarter";
  if (dim === "serviceType") return "service_type";
  return "month";
}

/**
 * Service module boundary for OLAP Explorer queries.
 * Connects to `/api/olap-pivot`, `/api/olap-slice`, `/api/olap-dice`, and `/api/time-trend`.
 */
export async function fetchOlapQuery(config: OlapQueryConfig): Promise<OlapQueryResult> {
  const { rowDimension, columnDimension, measure, sortBy, filters } = config;
  const activeBadges = detectActiveBadges(config);
  const { startDate, endDate } = resolveFilterDates(config);
  const isPivotMode = columnDimension !== null;

  // 1. PIVOT MODE -> Call GET /api/olap-pivot
  if (isPivotMode && columnDimension) {
    const params = new URLSearchParams({
      row_dimension: toBackendPivotRowDim(rowDimension),
      column_dimension: toBackendPivotColDim(columnDimension),
    });
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (filters.operators[0]) params.set("operator", filters.operators[0]);
    if (filters.serviceTypes[0]) params.set("service_type", filters.serviceTypes[0]);

    const rawRows = await fetchCachedJson<BackendPivotRow[]>(`/api/olap-pivot?${params.toString()}`);

    const colKeysSet = new Set<string>();
    const columnLabels: Record<string, string> = {};
    const columnTotals: Record<string, AggregatedMeasureValues> = {};
    const rowCellsMap = new Map<string, { label: string; cells: Record<string, AggregatedMeasureValues>; total: AggregatedMeasureValues }>();
    let grandTotal = emptyMeasures();

    for (const r of rawRows) {
      if (r.grouping_level === "grand_total") {
        grandTotal = mapPivotMeasures(r);
      } else if (r.grouping_level === "column_total" && r.column_key) {
        colKeysSet.add(r.column_key);
        columnLabels[r.column_key] = r.column_label;
        columnTotals[r.column_key] = mapPivotMeasures(r);
      } else if (r.grouping_level === "row_total" && r.row_key) {
        const entry = rowCellsMap.get(r.row_key) ?? { label: r.row_label, cells: {}, total: emptyMeasures() };
        entry.label = r.row_label;
        entry.total = mapPivotMeasures(r);
        rowCellsMap.set(r.row_key, entry);
      } else if (r.grouping_level === "cell" && r.row_key && r.column_key) {
        colKeysSet.add(r.column_key);
        columnLabels[r.column_key] = r.column_label;
        const entry = rowCellsMap.get(r.row_key) ?? { label: r.row_label, cells: {}, total: emptyMeasures() };
        entry.label = r.row_label;
        entry.cells[r.column_key] = mapPivotMeasures(r);
        rowCellsMap.set(r.row_key, entry);
      }
    }

    const columnKeys = Array.from(colKeysSet).sort();
    for (const ck of columnKeys) {
      if (!columnTotals[ck]) columnTotals[ck] = emptyMeasures();
    }

    const rows: PivotTableRow[] = Array.from(rowCellsMap.entries()).map(([rowKey, val]) => {
      const cells: Record<string, AggregatedMeasureValues> = {};
      for (const ck of columnKeys) {
        cells[ck] = val.cells[ck] ?? emptyMeasures();
      }
      return {
        rowKey,
        rowLabel: val.label,
        cells,
        rowTotal: val.total,
      };
    });

    sortPivotRows(rows, sortBy, measure);
    const cappedRows = rowDimension === "station" ? rows.slice(0, 25) : rows;

    const pivotResult: PivotTableResult = {
      rowDimension,
      columnDimension,
      columnKeys,
      columnLabels,
      rows: cappedRows,
      columnTotals,
      grandTotal,
    };

    return {
      config,
      isPivotMode: true,
      activeBadges,
      summary: grandTotal,
      pivotResult,
      groupedResult: null,
      dataTimestamp: new Date().toISOString(),
      isDemoData: false,
    };
  }

  // 2A. GROUPED MODE FOR TEMPORAL DIMENSIONS -> Call GET /api/time-trend
  if (rowDimension === "year" || rowDimension === "quarter" || rowDimension === "month") {
    const params = new URLSearchParams({ granularity: rowDimension });
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    const rawRows = await fetchCachedJson<BackendTimeTrendRow[]>(`/api/time-trend?${params.toString()}`);
    const totalRow = rawRows.find((r) => r.period_granularity === "total");
    const periodRows = rawRows.filter((r) => r.period_granularity !== "total");

    const rows: GroupedTableRow[] = periodRows.map((r) => {
      const distinctServices = toNum(r.distinct_services) ?? 0;
      const cancelledServices = toNum(r.cancelled_services) ?? 0;
      const validObs = toNum(r.valid_departure_observations) ?? 0;
      const avgDelay = toNum(r.average_departure_delay);
      const cancelRatePct = toNum(r.service_cancellation_rate);
      return {
        groupKey: r.period_key,
        groupLabel: getDimensionLabel(rowDimension, r.period_key),
        values: {
          distinctServiceCount: distinctServices,
          cancelledServiceCount: cancelledServices,
          cancellationRate: cancelRatePct !== null ? cancelRatePct / 100 : null,
          validDelayObservationCount: validObs,
          totalDepartureDelayMinutes: avgDelay !== null ? avgDelay * validObs : 0,
          averageDepartureDelayMinutes: avgDelay,
        },
      };
    });

    sortGroupedRows(rows, sortBy, measure);

    const totalAvgDelay = toNum(totalRow?.average_departure_delay);
    const totalValidObs = toNum(totalRow?.valid_departure_observations) ?? 0;
    const totalCancelRatePct = toNum(totalRow?.service_cancellation_rate);
    const summary: AggregatedMeasureValues = {
      distinctServiceCount: toNum(totalRow?.distinct_services) ?? 0,
      cancelledServiceCount: toNum(totalRow?.cancelled_services) ?? 0,
      cancellationRate: totalCancelRatePct !== null ? totalCancelRatePct / 100 : null,
      validDelayObservationCount: totalValidObs,
      totalDepartureDelayMinutes: totalAvgDelay !== null ? totalAvgDelay * totalValidObs : 0,
      averageDepartureDelayMinutes: totalAvgDelay,
    };

    const groupedResult: GroupedTableResult = {
      rowDimension,
      rows,
      summaryTotal: summary,
    };

    return {
      config,
      isPivotMode: false,
      activeBadges,
      summary,
      pivotResult: null,
      groupedResult,
      dataTimestamp: new Date().toISOString(),
      isDemoData: false,
    };
  }

  // 2B. GROUPED MODE FOR OPERATOR SLICE (No extra filters) -> Call GET /api/olap-slice
  const hasExtraFilters =
    filters.operators.length > 0 ||
    filters.serviceTypes.length > 0 ||
    filters.stations.length > 0 ||
    filters.quarters.length > 0 ||
    filters.months.length > 0;

  if (rowDimension === "operator" && !hasExtraFilters) {
    const sliceRows = await fetchCachedJson<BackendSliceRow[]>("/api/olap-slice");
    let totalServices = 0;
    let totalCancelled = 0;
    let totalValidObs = 0;
    let totalDelayMinutes = 0;

    const rows: GroupedTableRow[] = sliceRows.map((r) => {
      const key = r.group_value ?? "(Unknown)";
      const distinctServices = toNum(r.distinct_services) ?? 0;
      const cancelledServices = toNum(r.cancelled_services) ?? 0;
      const validObs = toNum(r.valid_observations) ?? 0;
      const avgDelay = toNum(r.average_departure_delay);
      const cancelRatePct = toNum(r.cancellation_rate);
      const delaySum = avgDelay !== null ? avgDelay * validObs : 0;

      totalServices += distinctServices;
      totalCancelled += cancelledServices;
      totalValidObs += validObs;
      totalDelayMinutes += delaySum;

      return {
        groupKey: key,
        groupLabel: key,
        values: {
          distinctServiceCount: distinctServices,
          cancelledServiceCount: cancelledServices,
          cancellationRate: cancelRatePct !== null ? cancelRatePct / 100 : null,
          validDelayObservationCount: validObs,
          totalDepartureDelayMinutes: delaySum,
          averageDepartureDelayMinutes: avgDelay,
        },
      };
    });

    sortGroupedRows(rows, sortBy, measure);

    const summary: AggregatedMeasureValues = {
      distinctServiceCount: totalServices,
      cancelledServiceCount: totalCancelled,
      cancellationRate: totalServices > 0 ? totalCancelled / totalServices : null,
      validDelayObservationCount: totalValidObs,
      totalDepartureDelayMinutes: totalDelayMinutes,
      averageDepartureDelayMinutes: totalValidObs > 0 ? totalDelayMinutes / totalValidObs : null,
    };

    return {
      config,
      isPivotMode: false,
      activeBadges,
      summary,
      pivotResult: null,
      groupedResult: { rowDimension, rows, summaryTotal: summary },
      dataTimestamp: new Date().toISOString(),
      isDemoData: false,
    };
  }

  // 2C. GROUPED MODE WITH DICE / STATION / SERVICE_TYPE -> Call GET /api/olap-dice
  const diceParams = new URLSearchParams();
  if (filters.operators.length > 0) diceParams.set("operators", filters.operators.join(","));
  if (filters.serviceTypes.length > 0) diceParams.set("service_types", filters.serviceTypes.join(","));
  if (startDate) diceParams.set("start_date", startDate);
  if (endDate) diceParams.set("end_date", endDate);

  const diceRows = await fetchCachedJson<BackendDiceRow[]>(`/api/olap-dice?${diceParams.toString()}`);

  const grandRow = diceRows.find((r) => r.grouping_level === "Grand Total");
  const summary = grandRow ? mapDiceMeasures(grandRow) : emptyMeasures();

  const rows: GroupedTableRow[] = [];

  if (rowDimension === "operator") {
    for (const r of diceRows) {
      if (r.grouping_level === "Operator Summary" && r.operator) {
        rows.push({
          groupKey: r.operator,
          groupLabel: r.operator,
          values: mapDiceMeasures(r),
        });
      }
    }
  } else if (rowDimension === "serviceType") {
    const byServiceType = new Map<string, AggregatedMeasureValues>();
    for (const r of diceRows) {
      if (r.grouping_level === "Operator-Service Summary" && r.service_type) {
        const cur = byServiceType.get(r.service_type) ?? emptyMeasures();
        const m = mapDiceMeasures(r);
        cur.distinctServiceCount += m.distinctServiceCount;
        cur.cancelledServiceCount += m.cancelledServiceCount;
        cur.validDelayObservationCount += m.validDelayObservationCount;
        cur.totalDepartureDelayMinutes += m.totalDepartureDelayMinutes;
        byServiceType.set(r.service_type, cur);
      }
    }
    for (const [key, raw] of byServiceType.entries()) {
      rows.push({
        groupKey: key,
        groupLabel: key,
        values: {
          ...raw,
          averageDepartureDelayMinutes:
            raw.validDelayObservationCount > 0
              ? raw.totalDepartureDelayMinutes / raw.validDelayObservationCount
              : null,
          cancellationRate:
            raw.distinctServiceCount > 0 ? raw.cancelledServiceCount / raw.distinctServiceCount : null,
        },
      });
    }
  } else {
    // rowDimension === "station"
    const byStation = new Map<string, { label: string; raw: AggregatedMeasureValues }>();
    for (const r of diceRows) {
      if (r.grouping_level === "Station Detail" && r.station_code) {
        const label = r.station_name ?? r.station_code;
        if (filters.stations.length > 0 && !filters.stations.includes(label)) continue;
        const entry = byStation.get(r.station_code) ?? { label, raw: emptyMeasures() };
        const m = mapDiceMeasures(r);
        entry.raw.distinctServiceCount += m.distinctServiceCount;
        entry.raw.cancelledServiceCount += m.cancelledServiceCount;
        entry.raw.validDelayObservationCount += m.validDelayObservationCount;
        entry.raw.totalDepartureDelayMinutes += m.totalDepartureDelayMinutes;
        byStation.set(r.station_code, entry);
      }
    }
    for (const [key, { label, raw }] of byStation.entries()) {
      rows.push({
        groupKey: key,
        groupLabel: label,
        values: {
          ...raw,
          averageDepartureDelayMinutes:
            raw.validDelayObservationCount > 0
              ? raw.totalDepartureDelayMinutes / raw.validDelayObservationCount
              : null,
          cancellationRate:
            raw.distinctServiceCount > 0 ? raw.cancelledServiceCount / raw.distinctServiceCount : null,
        },
      });
    }
  }

  sortGroupedRows(rows, sortBy, measure);
  const cappedRows = rowDimension === "station" ? rows.slice(0, 25) : rows;

  return {
    config,
    isPivotMode: false,
    activeBadges,
    summary,
    pivotResult: null,
    groupedResult: {
      rowDimension,
      rows: cappedRows,
      summaryTotal: summary,
    },
    dataTimestamp: new Date().toISOString(),
    isDemoData: false,
  };
}
