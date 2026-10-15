import { AppHeader } from "@/components/layout/AppHeader";
import type { PageId } from "@/components/layout/navigation";
import { ErrorState } from "@/components/overview/ChartCard";
import { CancellationTrendChart } from "@/components/time-trend/CancellationTrendChart";
import { HierarchyScopeBar } from "@/components/time-trend/HierarchyScopeBar";
import { MainPerformanceChart } from "@/components/time-trend/MainPerformanceChart";
import { ObservationVolumeChart } from "@/components/time-trend/ObservationVolumeChart";
import { PeriodBreakdownTable } from "@/components/time-trend/PeriodBreakdownTable";
import { TimeTrendControls } from "@/components/time-trend/TimeTrendControls";
import { TimeTrendSummaryCards } from "@/components/time-trend/TimeTrendSummaryCards";
import { useTimeTrendData } from "@/hooks/useTimeTrendData";

type TimeTrendPageProps = {
  onNavigate?: (page: PageId) => void;
};

export function TimeTrendPage({ onNavigate }: TimeTrendPageProps) {
  const {
    status,
    data,
    filters,
    setDateRange,
    setGranularity,
    setMetric,
    setCompareToPrevious,
    drillDown,
    rollUp,
    jumpToBreadcrumb,
    resetHierarchy,
    refresh,
  } = useTimeTrendData();

  const canRollUp = (data?.breadcrumbs?.length ?? 1) > 1;
  const isRefreshing = status === "loading";
  const points = data?.points ?? [];
  const summary = data?.summary ?? null;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <AppHeader
        title="Time & Trend Analysis"
        subtitle="Analyze railway reliability and delay trends across yearly, quarterly, monthly, and daily hierarchies."
        activePage="time-trend"
        onNavigate={onNavigate}
        dateRange={filters.dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        dataTimestamp={data?.dataTimestamp ?? null}
        isDemoData={data?.isDemoData ?? true}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        {status === "error" && !data ? (
          <ErrorState onRetry={refresh} message="Time & Trend Analysis data could not be loaded." />
        ) : (
          <>
            {/* 1. OLAP Hierarchy Scope & Breadcrumb Bar */}
            <HierarchyScopeBar
              breadcrumbs={data?.breadcrumbs ?? [{ granularity: "root", periodKey: "root", label: "All Years" }]}
              parentScopeDescription={data?.parentScopeDescription ?? "Interactive hierarchical drill-down"}
              canRollUp={canRollUp}
              onRollUp={rollUp}
              onBreadcrumbClick={jumpToBreadcrumb}
              onReset={resetHierarchy}
            />

            {/* 2. Controls Toolbar */}
            <TimeTrendControls
              dateRange={filters.dateRange}
              granularity={data?.activeGranularity ?? filters.granularity}
              metric={filters.metric}
              compareToPrevious={filters.compareToPrevious}
              onDateRangeChange={setDateRange}
              onGranularityChange={setGranularity}
              onMetricChange={setMetric}
              onCompareChange={setCompareToPrevious}
            />

            {/* 3. Summary Cards */}
            <TimeTrendSummaryCards
              summary={summary}
              compareToPrevious={filters.compareToPrevious}
              isLoading={status === "loading" && !data}
            />

            {/* 4. Main Performance Over Time Chart */}
            <MainPerformanceChart
              data={points}
              metric={filters.metric}
              granularity={data?.activeGranularity ?? filters.granularity}
              scopeLabel={data?.scopeLabel ?? "Current Scope"}
              compareToPrevious={filters.compareToPrevious}
              status={status}
              onDrillDown={drillDown}
              onRetry={refresh}
            />

            {/* 5. Cancellation & Volume Secondary Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <CancellationTrendChart
                data={points}
                granularity={data?.activeGranularity ?? filters.granularity}
                status={status}
                onDrillDown={drillDown}
                onRetry={refresh}
              />
              <ObservationVolumeChart
                data={points}
                granularity={data?.activeGranularity ?? filters.granularity}
                status={status}
                onDrillDown={drillDown}
                onRetry={refresh}
              />
            </div>

            {/* 6. Period Breakdown Table */}
            <PeriodBreakdownTable
              data={points}
              summary={summary}
              granularity={data?.activeGranularity ?? filters.granularity}
              status={status}
              onDrillDown={drillDown}
              onRetry={refresh}
            />

            {/* Disclaimer */}
            {data?.isDemoData && (
              <p className="text-xs text-muted-foreground">
                All metrics, time observations, and trends on this page are illustrative demo data for OLAP prototyping
                and do not represent real Dutch railway statistics.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
