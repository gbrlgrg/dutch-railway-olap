import { ChartCard, type AsyncStatus } from "@/components/overview/ChartCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMinutes, formatNumber } from "@/lib/formatters";
import type { StationDelay } from "@/types/overview";

type HighestDelayStationsTableProps = {
  data: StationDelay[];
  status: AsyncStatus;
  onRetry: () => void;
};

export function HighestDelayStationsTable({ data, status, onRetry }: HighestDelayStationsTableProps) {
  return (
    <ChartCard
      title="Highest-Delay Stations"
      description="Stations with the highest observed average departure delay. Not an indication of cause."
      status={status}
      isEmpty={data.length === 0}
      onRetry={onRetry}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Station</TableHead>
              <TableHead className="text-right">Avg delay</TableHead>
              <TableHead className="text-right">Valid observations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={row.stationName}>
                <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{row.stationName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMinutes(row.averageDepartureDelayMinutes)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.validDelayObservationCount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ChartCard>
  );
}
