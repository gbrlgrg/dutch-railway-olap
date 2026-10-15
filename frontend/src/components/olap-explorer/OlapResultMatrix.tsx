import { ArrowUpDown } from "lucide-react";

import { ChartCard, type AsyncStatus } from "@/components/overview/ChartCard";
import { getDimensionName } from "@/data/olapExplorerMockData";
import { formatMinutes, formatNumber, formatPercent } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  GroupedTableResult,
  OlapMeasure,
  OlapSortOption,
  PivotTableResult,
} from "@/types/olapExplorer";

type OlapResultMatrixProps = {
  isPivotMode: boolean;
  pivotResult: PivotTableResult | null;
  groupedResult: GroupedTableResult | null;
  measure: OlapMeasure;
  sortBy: OlapSortOption;
  onSortChange: (sort: OlapSortOption) => void;
  status: AsyncStatus;
  onRetry: () => void;
};

function formatCellValue(val: number | null | undefined, measure: OlapMeasure): string {
  if (val === null || val === undefined) return "—";
  switch (measure) {
    case "averageDepartureDelayMinutes":
      return formatMinutes(val);
    case "cancellationRate":
      return formatPercent(val);
    case "distinctServiceCount":
    case "validDelayObservationCount":
      return formatNumber(val);
  }
}

export function OlapResultMatrix({
  isPivotMode,
  pivotResult,
  groupedResult,
  measure,
  sortBy,
  onSortChange,
  status,
  onRetry,
}: OlapResultMatrixProps) {
  if (isPivotMode && pivotResult) {
    const { rowDimension, columnDimension, columnKeys, columnLabels, rows, columnTotals, grandTotal } = pivotResult;
    const title = `OLAP Result Matrix: ${getDimensionName(rowDimension)} × ${getDimensionName(columnDimension)}`;
    const description = `Cross-tabulated matrix showing ${measure} across row and column dimensions. Rightmost column and bottom row show weighted totals.`;

    const toggleSort = () => {
      onSortChange(sortBy === "measure-desc" ? "measure-asc" : sortBy === "measure-asc" ? "dimension" : "measure-desc");
    };

    return (
      <ChartCard
        title={title}
        description={description}
        status={status}
        isEmpty={rows.length === 0}
        onRetry={onRetry}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/30">
                <TableHead className="font-semibold text-foreground min-w-36">
                  <button
                    type="button"
                    onClick={toggleSort}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>{getDimensionName(rowDimension)}</span>
                    <ArrowUpDown className="size-3 text-muted-foreground" aria-hidden="true" />
                  </button>
                </TableHead>

                {columnKeys.map((ck) => (
                  <TableHead key={ck} className="text-right font-semibold text-foreground min-w-24">
                    {columnLabels[ck] ?? ck}
                  </TableHead>
                ))}

                <TableHead className="text-right font-bold text-foreground min-w-28 bg-muted/50 border-l">
                  Row Total
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.rowKey} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-foreground">
                    {row.rowLabel}
                  </TableCell>

                  {columnKeys.map((ck) => {
                    const cellVal = row.cells[ck]?.[measure] as number | null | undefined;
                    return (
                      <TableCell key={ck} className="text-right tabular-nums text-foreground/90">
                        {formatCellValue(cellVal, measure)}
                      </TableCell>
                    );
                  })}

                  <TableCell className="text-right tabular-nums font-semibold text-foreground bg-muted/30 border-l">
                    {formatCellValue(row.rowTotal[measure] as number | null, measure)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

            <TableFooter className="border-t-2 border-primary/20 bg-muted/60 font-semibold">
              <TableRow className="hover:bg-muted/70">
                <TableCell className="font-semibold text-foreground">
                  Column Total
                </TableCell>

                {columnKeys.map((ck) => {
                  const colTotalVal = columnTotals[ck]?.[measure] as number | null | undefined;
                  return (
                    <TableCell key={ck} className="text-right tabular-nums font-semibold text-foreground">
                      {formatCellValue(colTotalVal, measure)}
                    </TableCell>
                  );
                })}

                <TableCell className="text-right tabular-nums font-bold text-foreground bg-muted/80 border-l">
                  {formatCellValue(grandTotal[measure] as number | null, measure)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </ChartCard>
    );
  }

  // Standard Grouped Analytical Table
  const rows = groupedResult?.rows ?? [];
  const rowDimName = groupedResult ? getDimensionName(groupedResult.rowDimension) : "Dimension";
  const title = `Grouped Analytical Report (${rowDimName})`;
  const description = `Aggregated railway reliability and operational metrics grouped by ${rowDimName}.`;
  const summary = groupedResult?.summaryTotal;

  return (
    <ChartCard
      title={title}
      description={description}
      status={status}
      isEmpty={rows.length === 0}
      onRetry={onRetry}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/30">
              <TableHead className="font-semibold text-foreground min-w-36">
                {rowDimName}
              </TableHead>
              <TableHead className="text-right font-semibold">Distinct Services</TableHead>
              <TableHead className="text-right font-semibold">Cancelled Services</TableHead>
              <TableHead className="text-right font-semibold">Cancellation Rate</TableHead>
              <TableHead className="text-right font-semibold">Valid Delay Obs</TableHead>
              <TableHead className="text-right font-semibold">Avg Departure Delay</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.groupKey} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium text-foreground">
                  {row.groupLabel}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(row.values.distinctServiceCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatNumber(row.values.cancelledServiceCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(row.values.cancellationRate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(row.values.validDelayObservationCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-foreground">
                  {formatMinutes(row.values.averageDepartureDelayMinutes)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          {summary && (
            <TableFooter className="border-t-2 border-primary/20 bg-muted/60 font-semibold">
              <TableRow className="hover:bg-muted/70">
                <TableCell className="font-semibold text-foreground">
                  Total / Rolled-Up
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-foreground">
                  {formatNumber(summary.distinctServiceCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-foreground">
                  {formatNumber(summary.cancelledServiceCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-foreground">
                  {formatPercent(summary.cancellationRate)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-foreground">
                  {formatNumber(summary.validDelayObservationCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-foreground">
                  {formatMinutes(summary.averageDepartureDelayMinutes)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </ChartCard>
  );
}
