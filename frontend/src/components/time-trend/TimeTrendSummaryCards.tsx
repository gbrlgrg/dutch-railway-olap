import { Ban, Clock, Layers, TrainFront } from "lucide-react";

import { OverviewKpiCard } from "@/components/overview/OverviewKpiCard";
import {
  formatMinutes,
  formatMinutesDelta,
  formatNumber,
  formatNumberDelta,
  formatPercent,
  formatPercentPointDelta,
} from "@/lib/formatters";
import type { TimeTrendSummary } from "@/types/timeTrend";

type TimeTrendSummaryCardsProps = {
  summary: TimeTrendSummary | null;
  compareToPrevious: boolean;
  isLoading: boolean;
};

function formatVsPrevious(deltaText: string | null): string | null {
  return deltaText && deltaText !== "—" ? `${deltaText} vs previous period` : null;
}

export function TimeTrendSummaryCards({ summary, compareToPrevious, isLoading }: TimeTrendSummaryCardsProps) {
  const avgDelayDelta =
    summary &&
    typeof summary.previousPeriodAverageDelayMinutes === "number" &&
    typeof summary.averageDepartureDelayMinutes === "number"
      ? summary.averageDepartureDelayMinutes - summary.previousPeriodAverageDelayMinutes
      : null;

  const cancelRateDelta =
    summary &&
    typeof summary.previousPeriodCancellationRate === "number" &&
    typeof summary.cancellationRate === "number"
      ? summary.cancellationRate - summary.previousPeriodCancellationRate
      : null;

  const servicesDelta =
    summary && typeof summary.previousPeriodDistinctServices === "number"
      ? summary.distinctServiceCount - summary.previousPeriodDistinctServices
      : null;

  const obsDelta =
    summary && typeof summary.previousPeriodValidObservations === "number"
      ? summary.validDelayObservationCount - summary.previousPeriodValidObservations
      : null;

  return (
    <section aria-label="Rolled-up period summary metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OverviewKpiCard
        label="Average Departure Delay"
        icon={Clock}
        value={formatMinutes(summary?.averageDepartureDelayMinutes)}
        comparison={compareToPrevious ? formatVsPrevious(formatMinutesDelta(avgDelayDelta)) : undefined}
        definition="Calculated from valid stop-level departure-delay observations: SUM(delay) / COUNT(valid_observations). This is a weighted aggregate across the active scope."
        isLoading={isLoading}
      />

      <OverviewKpiCard
        label="Cancellation Rate"
        icon={Ban}
        value={formatPercent(summary?.cancellationRate)}
        comparison={compareToPrevious ? formatVsPrevious(formatPercentPointDelta(cancelRateDelta)) : undefined}
        definition="Calculated from distinct cancelled services divided by total distinct services in the active scope. Service-level denominator."
        isLoading={isLoading}
      />

      <OverviewKpiCard
        label="Services Observed"
        icon={TrainFront}
        value={formatNumber(summary?.distinctServiceCount)}
        comparison={compareToPrevious ? formatVsPrevious(formatNumberDelta(servicesDelta)) : undefined}
        definition="Total distinct train services operated in the active scope. Each service is counted once rather than per station stop."
        isLoading={isLoading}
      />

      <OverviewKpiCard
        label="Valid Delay Observations"
        icon={Layers}
        value={formatNumber(summary?.validDelayObservationCount)}
        comparison={compareToPrevious ? formatVsPrevious(formatNumberDelta(obsDelta)) : undefined}
        definition="Count of non-null stop-level departure-delay observations in the active scope. Represents the statistical sample size."
        isLoading={isLoading}
      />
    </section>
  );
}
