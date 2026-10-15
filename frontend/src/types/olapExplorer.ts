/**
 * UI contracts and data structures for the OLAP Explorer workspace.
 * Strict typing for multi-dimensional operations: Slice, Dice, and Pivot.
 */

export type OlapDimension =
  | "operator"
  | "station"
  | "serviceType"
  | "year"
  | "quarter"
  | "month";

export type OlapMeasure =
  | "averageDepartureDelayMinutes"
  | "cancellationRate"
  | "distinctServiceCount"
  | "validDelayObservationCount";

export type OlapFilterState = {
  years: string[];
  quarters: string[];
  months: string[];
  operators: string[];
  stations: string[];
  serviceTypes: string[];
};

export type OlapSortOption = "dimension" | "measure-desc" | "measure-asc";

export type OlapQueryConfig = {
  templateId: string | null;
  rowDimension: OlapDimension;
  columnDimension: OlapDimension | null; // null represents standard Grouped mode; non-null activates Pivot mode
  measure: OlapMeasure;
  filters: OlapFilterState;
  sortBy: OlapSortOption;
};

export type OlapCubeCell = {
  year: string;
  quarter: string;
  month: string;
  operator: string;
  station: string;
  serviceType: string;
  distinctServiceCount: number;
  cancelledServiceCount: number;
  validDelayObservationCount: number;
  totalDepartureDelayMinutes: number;
};

export type AggregatedMeasureValues = {
  distinctServiceCount: number;
  cancelledServiceCount: number;
  cancellationRate: number | null;
  validDelayObservationCount: number;
  totalDepartureDelayMinutes: number;
  averageDepartureDelayMinutes: number | null;
};

export type PivotTableRow = {
  rowKey: string;
  rowLabel: string;
  cells: Record<string, AggregatedMeasureValues>;
  rowTotal: AggregatedMeasureValues;
};

export type PivotTableResult = {
  rowDimension: OlapDimension;
  columnDimension: OlapDimension;
  columnKeys: string[];
  columnLabels: Record<string, string>;
  rows: PivotTableRow[];
  columnTotals: Record<string, AggregatedMeasureValues>;
  grandTotal: AggregatedMeasureValues;
};

export type GroupedTableRow = {
  groupKey: string;
  groupLabel: string;
  values: AggregatedMeasureValues;
};

export type GroupedTableResult = {
  rowDimension: OlapDimension;
  rows: GroupedTableRow[];
  summaryTotal: AggregatedMeasureValues;
};

export type OlapOperationBadgeType = {
  type: "SLICE" | "DICE" | "PIVOT";
  label: string;
  description: string;
};

export type ReportTemplate = {
  id: string;
  title: string;
  description: string;
  category: "operator" | "station" | "matrix" | "service";
  config: OlapQueryConfig;
};

export type OlapQueryResult = {
  config: OlapQueryConfig;
  isPivotMode: boolean;
  activeBadges: OlapOperationBadgeType[];
  summary: AggregatedMeasureValues;
  pivotResult: PivotTableResult | null;
  groupedResult: GroupedTableResult | null;
  dataTimestamp: string;
  isDemoData: boolean;
};
