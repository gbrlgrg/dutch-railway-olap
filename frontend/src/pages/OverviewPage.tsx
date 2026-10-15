import { useState } from "react";
import { Ban, Clock, MapPin, TrainFront } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import type { PageId } from "@/components/layout/navigation";
import { CancellationTrendChart } from "@/components/overview/CancellationTrendChart";
import { ErrorState } from "@/components/overview/ChartCard";
import { DelayTrendChart } from "@/components/overview/DelayTrendChart";
import { ExploreFurtherCards } from "@/components/overview/ExploreFurtherCards";
import { HighestDelayStationsTable } from "@/components/overview/HighestDelayStationsTable";
import { OperatorPerformanceCard } from "@/components/overview/OperatorPerformanceCard";
import { OverviewKpiCard } from "@/components/overview/OverviewKpiCard";
import { useOverviewData } from "@/hooks/useOverviewData";
import {
  formatMinutes,
  formatMinutesDelta,
  formatNumber,
  formatNumberDelta,
  formatPercent,
  formatPercentPointDelta,
} from "@/lib/formatters";
import type { DateRangePreset, Granularity } from "@/types/overview";

const DEFAULT_GRANULARITY: Record<DateRangePreset, Granularity> = {
  "last-7-days": "day",
  "last-30-days": "day",
  "last-3-months": "day",
  "last-6-months": "month",
  "last-12-months": "month",
  "all-data": "month",
};

function vsPrevious(text: string | null): string | null {
  return text && text !== "—" ? `${text} vs previous period` : null;
}

type OverviewPageProps = {
  onNavigate?: (page: PageId) => void;
};

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const [dateRange, setDateRange] = useState<DateRangePreset>("last-12-months");
  const [granularity, setGranularity] = useState<Granularity>(DEFAULT_GRANULARITY["last-12-months"]);
  const { status, data, refresh } = useOverviewData({ dateRange, granularity });

  const handleDateRangeChange = (value: DateRangePreset) => {
    setDateRange(value);
    setGranularity(DEFAULT_GRANULARITY[value]);
  };

  const sectionStatus = data ? "success" : status;
  const isLoading = !data && status === "loading";
  const metrics = data?.metrics;
  const comparison = data?.comparison;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <AppHeader
        title="Overview"
        subtitle="A high-level view of railway service reliability and performance."
        activePage="overview"
        onNavigate={onNavigate}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onRefresh={refresh}
        isRefreshing={status === "loading"}
        dataTimestamp={data?.dataTimestamp ?? null}
        isDemoData={data?.isDemoData ?? true}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        {status === "error" && !data ? (
          <ErrorState onRetry={refresh} message="Overview data could not be loaded." />
        ) : (
          <>
            <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewKpiCard
                label="Average Departure Delay"
                icon={Clock}
                value={formatMinutes(metrics?.averageDepartureDelayMinutes)}
                comparison={vsPrevious(formatMinutesDelta(comparison?.averageDepartureDelayMinutesDelta))}
                definition="Mean departure delay across stop-level observations with a valid (non-null) delay value."
                isLoading={isLoading}
              />
              <OverviewKpiCard
                label="Services Operated"
                icon={TrainFront}
                value={formatNumber(metrics?.distinctServiceCount)}
                comparison={vsPrevious(formatNumberDelta(comparison?.distinctServiceCountDelta))}
                definition="Count of distinct service identifiers in the selected period. Stop rows are not counted individually."
                isLoading={isLoading}
              />
              <OverviewKpiCard
                label="Cancellation Rate"
                icon={Ban}
                value={formatPercent(metrics?.cancellationRate)}
                comparison={vsPrevious(formatPercentPointDelta(comparison?.cancellationRateDelta))}
                definition="Cancelled distinct services divided by all distinct services in the period. The cancellation rule is to be confirmed against the dataset."
                isLoading={isLoading}
              />
              <OverviewKpiCard
                label="Stations Observed"
                icon={MapPin}
                value={formatNumber(metrics?.distinctStationCount)}
                comparison={vsPrevious(formatNumberDelta(comparison?.distinctStationCountDelta))}
                definition="Count of distinct stations appearing in the selected period."
                isLoading={isLoading}
              />
            </section>

            <div className="grid gap-6 xl:grid-cols-3">
              <DelayTrendChart
                data={data?.delayTrend ?? []}
                granularity={granularity}
                onGranularityChange={setGranularity}
                status={sectionStatus}
                onRetry={refresh}
              />
              <CancellationTrendChart data={data?.cancellationTrend ?? []} status={sectionStatus} onRetry={refresh} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <OperatorPerformanceCard data={data?.operatorPerformance ?? []} status={sectionStatus} onRetry={refresh} />
              <HighestDelayStationsTable data={data?.highestDelayStations ?? []} status={sectionStatus} onRetry={refresh} />
            </div>

            <ExploreFurtherCards onNavigate={onNavigate} />

            {data?.isDemoData && (
              <p className="text-xs text-muted-foreground">
                All figures, operator names, and station names on this page are illustrative demo data and do not
                represent real Dutch railway statistics.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
