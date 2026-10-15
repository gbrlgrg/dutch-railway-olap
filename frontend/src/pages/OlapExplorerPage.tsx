import { useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import type { PageId } from "@/components/layout/navigation";
import { OlapQueryBuilder } from "@/components/olap-explorer/OlapQueryBuilder";
import { OlapResultMatrix } from "@/components/olap-explorer/OlapResultMatrix";
import { OlapSummaryCards } from "@/components/olap-explorer/OlapSummaryCards";
import { OlapVisualizationCard } from "@/components/olap-explorer/OlapVisualizationCard";
import { ReportTemplatesBar } from "@/components/olap-explorer/ReportTemplatesBar";
import { SliceDiceFilterBar } from "@/components/olap-explorer/SliceDiceFilterBar";
import { ErrorState } from "@/components/overview/ChartCard";
import { useOlapExplorerData } from "@/hooks/useOlapExplorerData";
import type { DateRangePreset } from "@/types/overview";

type OlapExplorerPageProps = {
  onNavigate?: (page: PageId) => void;
};

export function OlapExplorerPage({ onNavigate }: OlapExplorerPageProps) {
  const [dateRange, setDateRange] = useState<DateRangePreset>("all-data");

  const {
    status,
    data,
    config,
    loadTemplate,
    setRowDimension,
    setColumnDimension,
    swapDimensions,
    setMeasure,
    setFilterValues,
    clearFilters,
    setSortBy,
    refresh,
  } = useOlapExplorerData();

  const isRefreshing = status === "loading";
  const summary = data?.summary ?? null;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <AppHeader
        title="OLAP Explorer"
        subtitle="Configure dimensions, measures, filters, and pivot layouts for multi-dimensional railway analysis."
        activePage="olap-explorer"
        onNavigate={onNavigate}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        dataTimestamp={data?.dataTimestamp ?? null}
        isDemoData={data?.isDemoData ?? true}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        {status === "error" && !data ? (
          <ErrorState onRetry={refresh} message="OLAP cube data could not be computed." />
        ) : (
          <>
            {/* 1. Quick Report Templates Bar (Includes Operator & Station Analysis) */}
            <ReportTemplatesBar
              activeTemplateId={config.templateId}
              onSelectTemplate={loadTemplate}
            />

            {/* 2. OLAP Query Configuration Panel */}
            <OlapQueryBuilder
              rowDimension={config.rowDimension}
              columnDimension={config.columnDimension}
              measure={config.measure}
              onRowDimensionChange={setRowDimension}
              onColumnDimensionChange={setColumnDimension}
              onSwapDimensions={swapDimensions}
              onMeasureChange={setMeasure}
            />

            {/* 3. Slice and Dice Filter Bar with live OLAP operation badges */}
            <SliceDiceFilterBar
              activeBadges={data?.activeBadges ?? []}
              filters={config.filters}
              onFilterChange={setFilterValues}
              onClearFilters={clearFilters}
            />

            {/* 4. Sub-Cube Summary KPI Cards */}
            <OlapSummaryCards
              summary={summary}
              isLoading={status === "loading" && !data}
            />

            {/* 5. Dynamic OLAP Chart Visualization */}
            <OlapVisualizationCard
              isPivotMode={data?.isPivotMode ?? false}
              pivotResult={data?.pivotResult ?? null}
              groupedResult={data?.groupedResult ?? null}
              measure={config.measure}
              status={status}
              onRetry={refresh}
            />

            {/* 6. Dynamic Pivot Result Matrix / Grouped Analytical Table */}
            <OlapResultMatrix
              isPivotMode={data?.isPivotMode ?? false}
              pivotResult={data?.pivotResult ?? null}
              groupedResult={data?.groupedResult ?? null}
              measure={config.measure}
              sortBy={config.sortBy}
              onSortChange={setSortBy}
              status={status}
              onRetry={refresh}
            />

            {/* Illustrative data disclaimer */}
            {data?.isDemoData && (
              <p className="text-xs text-muted-foreground">
                All metrics, cross-tabulations, operator names, and station figures in this OLAP cube are illustrative
                mock data and do not represent real Dutch railway operations statistics.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
