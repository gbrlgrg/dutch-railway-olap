/**
 * OLAP Multi-Dimensional Mock Cube & Aggregation Engine.
 * Supports dynamic Slice, Dice, and Pivot cross-tabulations.
 *
 * Analytical Invariants:
 * - Weighted average delay: SUM(delayMinutes) / COUNT(validObservations)
 * - Cancellation rate: SUM(cancelledServices) / COUNT(distinctServices)
 */

import type {
  AggregatedMeasureValues,
  GroupedTableRow,
  GroupedTableResult,
  OlapCubeCell,
  OlapDimension,
  OlapFilterState,
  OlapOperationBadgeType,
  OlapQueryConfig,
  OlapQueryResult,
  PivotTableRow,
  PivotTableResult,
  ReportTemplate,
} from "@/types/olapExplorer";

export const OLAP_OPERATORS = [
  "NS",
  "Arriva",
  "Qbuzz",
  "Keolis",
  "Blauwnet",
  "Connexxion",
  "NS International",
];

export const OLAP_STATIONS = [
  "Utrecht Centraal",
  "Amsterdam Centraal",
  "Schiphol Airport",
  "Rotterdam Centraal",
  "Den Haag HS",
  "Eindhoven Centraal",
  "Leiden Centraal",
  "Zwolle",
];

export const OLAP_SERVICE_TYPES = [
  "Intercity",
  "Sprinter",
  "Sneltrein",
  "Stoptrein",
  "Eurocity Direct",
];

export const OLAP_YEARS = ["2025"];

export const OLAP_QUARTERS = [
  "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4",
];

export const OLAP_MONTHS = [
  "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
  "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function getDimensionLabel(dimension: OlapDimension, key: string): string {
  if (dimension === "month") {
    const [year, month] = key.split("-");
    const mIdx = Number(month) - 1;
    return `${MONTH_NAMES_SHORT[mIdx]} '${year?.slice(2)}`;
  }
  if (dimension === "quarter") {
    return key.replace("-", " ");
  }
  return key;
}

export function getDimensionName(dimension: OlapDimension): string {
  switch (dimension) {
    case "operator": return "Operator";
    case "station": return "Station";
    case "serviceType": return "Service Type";
    case "year": return "Year";
    case "quarter": return "Quarter";
    case "month": return "Month";
  }
}

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

/** Pre-builds the multi-dimensional cube cells. */
function buildMockCube(): OlapCubeCell[] {
  const random = createRandom(20241015);
  const cells: OlapCubeCell[] = [];

  for (const year of OLAP_YEARS) {
    for (let m = 1; m <= 12; m++) {
      const monthStr = m < 10 ? `0${m}` : `${m}`;
      const month = `${year}-${monthStr}`;
      const qNum = Math.ceil(m / 3);
      const quarter = `${year}-Q${qNum}`;

      for (const operator of OLAP_OPERATORS) {
        for (const serviceType of OLAP_SERVICE_TYPES) {
          for (const station of OLAP_STATIONS) {
            const baseDelay =
              (operator === "Operator A" ? 2.1 : operator === "Operator B" ? 3.4 : 2.8) +
              (serviceType === "International" ? 1.5 : serviceType === "Intercity" ? 0.4 : -0.2) +
              (station === "Station Centraal" ? 1.2 : station === "Station Zuid" ? 0.6 : 0) +
              (m >= 11 || m <= 2 ? 0.8 : 0) +
              (random() - 0.5) * 1.0;

            const safeDelay = Math.max(0.4, baseDelay);
            const distinctServices = Math.round(180 + random() * 220);
            const validDelayObs = Math.round(distinctServices * (9 + random() * 4));
            const cancelRate = Math.max(0.005, 0.02 + (random() - 0.5) * 0.015);
            const cancelledServices = Math.round(distinctServices * cancelRate);

            cells.push({
              year,
              quarter,
              month,
              operator,
              station,
              serviceType,
              distinctServiceCount: distinctServices,
              cancelledServiceCount: cancelledServices,
              validDelayObservationCount: validDelayObs,
              totalDepartureDelayMinutes: safeDelay * validDelayObs,
            });
          }
        }
      }
    }
  }

  return cells;
}

const CUBE_CELLS = buildMockCube();

export const EMPTY_FILTERS: OlapFilterState = {
  years: [],
  quarters: [],
  months: [],
  operators: [],
  stations: [],
  serviceTypes: [],
};

export const PREDEFINED_TEMPLATES: ReportTemplate[] = [
  {
    id: "template-operator-month-delay",
    title: "Operator × Month Delay Matrix",
    description: "Pivot cross-tabulation of average departure delay by operator across months, sliced to 2025.",
    category: "matrix",
    config: {
      templateId: "template-operator-month-delay",
      rowDimension: "operator",
      columnDimension: "month",
      measure: "averageDepartureDelayMinutes",
      filters: { ...EMPTY_FILTERS, years: ["2025"] },
      sortBy: "measure-desc",
    },
  },
  {
    id: "template-operator-performance",
    title: "Operator Performance Comparison",
    description: "Rank railway operators by delay and reliability with service volume metrics (Operator Analysis).",
    category: "operator",
    config: {
      templateId: "template-operator-performance",
      rowDimension: "operator",
      columnDimension: null,
      measure: "averageDepartureDelayMinutes",
      filters: EMPTY_FILTERS,
      sortBy: "measure-desc",
    },
  },
  {
    id: "template-station-by-service-type",
    title: "Highest-Delay Stations by Service Type",
    description: "Station delay cross-tabulated across Intercity, Sprinter, and International trains (Station Analysis).",
    category: "station",
    config: {
      templateId: "template-station-by-service-type",
      rowDimension: "station",
      columnDimension: "serviceType",
      measure: "averageDepartureDelayMinutes",
      filters: { ...EMPTY_FILTERS, years: ["2025"] },
      sortBy: "measure-desc",
    },
  },
  {
    id: "template-servicetype-quarter-cancel",
    title: "Service Type × Quarter Cancellation Matrix",
    description: "Examine cancellation percentage matrices across quarterly periods and service classes.",
    category: "service",
    config: {
      templateId: "template-servicetype-quarter-cancel",
      rowDimension: "serviceType",
      columnDimension: "quarter",
      measure: "cancellationRate",
      filters: EMPTY_FILTERS,
      sortBy: "dimension",
    },
  },
];

function createEmptyMeasures(): AggregatedMeasureValues {
  return {
    distinctServiceCount: 0,
    cancelledServiceCount: 0,
    cancellationRate: null,
    validDelayObservationCount: 0,
    totalDepartureDelayMinutes: 0,
    averageDepartureDelayMinutes: null,
  };
}

function accumulate(target: AggregatedMeasureValues, cell: OlapCubeCell) {
  target.distinctServiceCount += cell.distinctServiceCount;
  target.cancelledServiceCount += cell.cancelledServiceCount;
  target.validDelayObservationCount += cell.validDelayObservationCount;
  target.totalDepartureDelayMinutes += cell.totalDepartureDelayMinutes;
}

function finalize(target: AggregatedMeasureValues): AggregatedMeasureValues {
  return {
    ...target,
    averageDepartureDelayMinutes:
      target.validDelayObservationCount > 0
        ? target.totalDepartureDelayMinutes / target.validDelayObservationCount
        : null,
    cancellationRate:
      target.distinctServiceCount > 0
        ? target.cancelledServiceCount / target.distinctServiceCount
        : null,
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

export function executeOlapQuery(config: OlapQueryConfig): OlapQueryResult {
  const { filters, rowDimension, columnDimension, measure, sortBy } = config;

  // 1. Filter cells (Slice & Dice)
  const matchingCells = CUBE_CELLS.filter((cell) => {
    if (filters.years.length > 0 && !filters.years.includes(cell.year)) return false;
    if (filters.quarters.length > 0 && !filters.quarters.includes(cell.quarter)) return false;
    if (filters.months.length > 0 && !filters.months.includes(cell.month)) return false;
    if (filters.operators.length > 0 && !filters.operators.includes(cell.operator)) return false;
    if (filters.stations.length > 0 && !filters.stations.includes(cell.station)) return false;
    if (filters.serviceTypes.length > 0 && !filters.serviceTypes.includes(cell.serviceType)) return false;
    return true;
  });

  // 2. Compute grand summary of the filtered sub-cube
  const grandSummaryRaw = createEmptyMeasures();
  for (const cell of matchingCells) {
    accumulate(grandSummaryRaw, cell);
  }
  const summary = finalize(grandSummaryRaw);

  const activeBadges = detectActiveBadges(config);
  const isPivotMode = columnDimension !== null;

  if (isPivotMode && columnDimension) {
    // 3A. PIVOT MODE (Cross-tabulation)
    const rowMap = new Map<string, Map<string, AggregatedMeasureValues>>();
    const colKeysSet = new Set<string>();

    for (const cell of matchingCells) {
      const rKey = cell[rowDimension];
      const cKey = cell[columnDimension];
      colKeysSet.add(cKey);

      let colMap = rowMap.get(rKey);
      if (!colMap) {
        colMap = new Map();
        rowMap.set(rKey, colMap);
      }

      let cellTarget = colMap.get(cKey);
      if (!cellTarget) {
        cellTarget = createEmptyMeasures();
        colMap.set(cKey, cellTarget);
      }
      accumulate(cellTarget, cell);
    }

    const columnKeys = Array.from(colKeysSet).sort();
    const columnLabels: Record<string, string> = {};
    for (const ck of columnKeys) {
      columnLabels[ck] = getDimensionLabel(columnDimension, ck);
    }

    const columnTotalsRaw: Record<string, AggregatedMeasureValues> = {};
    for (const ck of columnKeys) {
      columnTotalsRaw[ck] = createEmptyMeasures();
    }

    const rows: PivotTableRow[] = [];

    for (const [rKey, colMap] of rowMap.entries()) {
      const rowCells: Record<string, AggregatedMeasureValues> = {};
      const rowTotalRaw = createEmptyMeasures();

      for (const ck of columnKeys) {
        const rawCell = colMap.get(ck);
        if (rawCell) {
          const fin = finalize(rawCell);
          rowCells[ck] = fin;
          accumulate(rowTotalRaw, {
            ...cellDefaults(rKey, ck),
            distinctServiceCount: rawCell.distinctServiceCount,
            cancelledServiceCount: rawCell.cancelledServiceCount,
            validDelayObservationCount: rawCell.validDelayObservationCount,
            totalDepartureDelayMinutes: rawCell.totalDepartureDelayMinutes,
          });
          accumulate(columnTotalsRaw[ck], {
            ...cellDefaults(rKey, ck),
            distinctServiceCount: rawCell.distinctServiceCount,
            cancelledServiceCount: rawCell.cancelledServiceCount,
            validDelayObservationCount: rawCell.validDelayObservationCount,
            totalDepartureDelayMinutes: rawCell.totalDepartureDelayMinutes,
          });
        } else {
          rowCells[ck] = createEmptyMeasures();
        }
      }

      rows.push({
        rowKey: rKey,
        rowLabel: getDimensionLabel(rowDimension, rKey),
        cells: rowCells,
        rowTotal: finalize(rowTotalRaw),
      });
    }

    // Sort pivot rows
    rows.sort((a, b) => {
      if (sortBy === "dimension") return a.rowLabel.localeCompare(b.rowLabel);
      const valA = (a.rowTotal[measure] as number | null) ?? -Infinity;
      const valB = (b.rowTotal[measure] as number | null) ?? -Infinity;
      return sortBy === "measure-desc" ? valB - valA : valA - valB;
    });

    const columnTotals: Record<string, AggregatedMeasureValues> = {};
    for (const ck of columnKeys) {
      columnTotals[ck] = finalize(columnTotalsRaw[ck]);
    }

    const pivotResult: PivotTableResult = {
      rowDimension,
      columnDimension,
      columnKeys,
      columnLabels,
      rows,
      columnTotals,
      grandTotal: summary,
    };

    return {
      config,
      isPivotMode: true,
      activeBadges,
      summary,
      pivotResult,
      groupedResult: null,
      dataTimestamp: "2025-01-02T06:00:00Z",
      isDemoData: true,
    };
  }

  // 3B. GROUPED MODE (Standard report)
  const groupMap = new Map<string, AggregatedMeasureValues>();

  for (const cell of matchingCells) {
    const key = cell[rowDimension];
    let target = groupMap.get(key);
    if (!target) {
      target = createEmptyMeasures();
      groupMap.set(key, target);
    }
    accumulate(target, cell);
  }

  const groupedRows: GroupedTableRow[] = Array.from(groupMap.entries()).map(([key, raw]) => ({
    groupKey: key,
    groupLabel: getDimensionLabel(rowDimension, key),
    values: finalize(raw),
  }));

  // Sort grouped rows
  groupedRows.sort((a, b) => {
    if (sortBy === "dimension") return a.groupLabel.localeCompare(b.groupLabel);
    const valA = (a.values[measure] as number | null) ?? -Infinity;
    const valB = (b.values[measure] as number | null) ?? -Infinity;
    return sortBy === "measure-desc" ? valB - valA : valA - valB;
  });

  const groupedResult: GroupedTableResult = {
    rowDimension,
    rows: groupedRows,
    summaryTotal: summary,
  };

  return {
    config,
    isPivotMode: false,
    activeBadges,
    summary,
    pivotResult: null,
    groupedResult,
    dataTimestamp: "2025-01-02T06:00:00Z",
    isDemoData: true,
  };
}

function cellDefaults(rowVal: string, colVal: string): OlapCubeCell {
  return {
    year: "2024",
    quarter: "2024-Q1",
    month: "2024-01",
    operator: rowVal,
    station: colVal,
    serviceType: "Intercity",
    distinctServiceCount: 0,
    cancelledServiceCount: 0,
    validDelayObservationCount: 0,
    totalDepartureDelayMinutes: 0,
  };
}
