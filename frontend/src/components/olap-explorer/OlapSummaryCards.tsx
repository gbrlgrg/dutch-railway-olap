import { Ban, Clock, Layers, TrainFront } from "lucide-react";

import { OverviewKpiCard } from "@/components/overview/OverviewKpiCard";
import { formatMinutes, formatNumber, formatPercent } from "@/lib/formatters";
import type { AggregatedMeasureValues } from "@/types/olapExplorer";

type OlapSummaryCardsProps = {
  summary: AggregatedMeasureValues | null;
  isLoading: boolean;
};

export function OlapSummaryCards({ summary, isLoading }: OlapSummaryCardsProps) {
  return (
    <section aria-label="Sub-cube summary metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OverviewKpiCard
        label="Average Departure Delay"
        icon={Clock}
        value={formatMinutes(summary?.averageDepartureDelayMinutes)}
        definition="Weighted stop-level average departure delay across all matching sub-cube records: SUM(delay) / COUNT(valid_observations)."
        isLoading={isLoading}
      />

      <OverviewKpiCard
        label="Services Operated"
        icon={TrainFront}
        value={formatNumber(summary?.distinctServiceCount)}
        definition="Count of distinct railway services matching the active slice and dice query constraints."
        isLoading={isLoading}
      />

      <OverviewKpiCard
        label="Cancellation Rate"
        icon={Ban}
        value={formatPercent(summary?.cancellationRate)}
        definition="Service-level cancellation rate: cancelled distinct services divided by total distinct services operated in the sub-cube."
        isLoading={isLoading}
      />

      <OverviewKpiCard
        label="Valid Delay Observations"
        icon={Layers}
        value={formatNumber(summary?.validDelayObservationCount)}
        definition="Count of non-null stop-level departure-delay observations backing the delay average."
        isLoading={isLoading}
      />
    </section>
  );
}
