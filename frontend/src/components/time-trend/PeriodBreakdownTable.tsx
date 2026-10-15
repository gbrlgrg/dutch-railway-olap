import { ArrowDownRight } from "lucide-react";

import { ChartCard, type AsyncStatus } from "@/components/overview/ChartCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMinutes, formatNumber, formatPercent } from "@/lib/formatters";
import type { TimeGranularity, TimeTrendPoint, TimeTrendSummary } from "@/types/timeTrend";

type PeriodBreakdownTableProps = {
  data: TimeTrendPoint[];
  summary: TimeTrendSummary | null;
  granularity: TimeGranularity;
  status: AsyncStatus;
  onDrillDown: (periodKey: string) => void;
  onRetry: () => void;
};

export function PeriodBreakdownTable({
  data,
  summary,
  granularity,
  status,
  onDrillDown,
  onRetry,
}: PeriodBreakdownTableProps) {
  const canDrillDown = granularity !== "day";

  return (
    <ChartCard
      title="Period Breakdown"
      description="Tabular breakdown of railway service reliability across the active time periods."
      status={status}
      isEmpty={data.length === 0}
      onRetry={onRetry}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36 font-semibold">Period</TableHead>
              <TableHead className="text-right font-semibold">Distinct Services</TableHead>
              <TableHead className="text-right font-semibold">Cancelled Services</TableHead>
              <TableHead className="text-right font-semibold">Cancellation Rate</TableHead>
              <TableHead className="text-right font-semibold">Valid Delay Obs</TableHead>
              <TableHead className="text-right font-semibold">Avg Departure Delay</TableHead>
              <TableHead className="text-center w-32 font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.periodKey} className="hover:bg-muted/40 transition-colors">
                <TableCell className="font-medium text-foreground">
                  {row.label}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(row.distinctServiceCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatNumber(row.cancelledServiceCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(row.cancellationRate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(row.validDelayObservationCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatMinutes(row.averageDepartureDelayMinutes)}
                </TableCell>
                <TableCell className="text-center">
                  {canDrillDown ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDrillDown(row.periodKey)}
                      className="h-7 px-2 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
                    >
                      <span>Drill down</span>
                      <ArrowDownRight className="size-3" aria-hidden="true" />
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] text-muted-foreground font-normal">
                      Leaf level
                    </Badge>
                  )}
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
                <TableCell className="text-center text-xs text-muted-foreground font-normal">
                  Weighted sum
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </ChartCard>
  );
}
