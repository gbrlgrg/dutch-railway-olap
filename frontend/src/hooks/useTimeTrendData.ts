import { useCallback, useEffect, useState } from "react";

import type { AsyncStatus } from "@/components/overview/ChartCard";
import { fetchTimeTrend } from "@/services/timeTrendService";
import type {
  DateRangePreset,
  TimeGranularity,
  TimeTrendData,
  TimeTrendFilterState,
  TimeTrendMetric,
} from "@/types/timeTrend";

const DEFAULT_FILTERS: TimeTrendFilterState = {
  dateRange: "all-data",
  granularity: "year",
  metric: "averageDepartureDelayMinutes",
  selectedParentPeriodKey: null,
  compareToPrevious: true,
};

export type TimeTrendHookState = {
  status: AsyncStatus;
  data: TimeTrendData | null;
  filters: TimeTrendFilterState;
  setDateRange: (range: DateRangePreset) => void;
  setGranularity: (granularity: TimeGranularity) => void;
  setMetric: (metric: TimeTrendMetric) => void;
  setCompareToPrevious: (compare: boolean) => void;
  drillDown: (periodKey: string) => void;
  rollUp: () => void;
  jumpToBreadcrumb: (index: number) => void;
  resetHierarchy: () => void;
  refresh: () => void;
};

type Result = { key: string; data: TimeTrendData | null; error: Error | null };

export function useTimeTrendData(): TimeTrendHookState {
  const [filters, setFilters] = useState<TimeTrendFilterState>(DEFAULT_FILTERS);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [lastData, setLastData] = useState<TimeTrendData | null>(null);

  const key = `${filters.dateRange}|${filters.granularity}|${filters.metric}|${filters.selectedParentPeriodKey}|${filters.compareToPrevious}|${nonce}`;

  useEffect(() => {
    let cancelled = false;

    fetchTimeTrend(filters).then(
      (res) => {
        if (cancelled) return;
        setResult({ key, data: res, error: null });
        setLastData(res);
      },
      (error: unknown) => {
        if (cancelled) return;
        setResult({ key, data: null, error: error instanceof Error ? error : new Error(String(error)) });
      },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const status: AsyncStatus = result?.key !== key ? "loading" : result.error ? "error" : "success";
  const data = status === "error" ? null : (result?.data ?? lastData);

  const setDateRange = useCallback((dateRange: DateRangePreset) => {
    setFilters((prev) => ({ ...prev, dateRange }));
  }, []);

  const setGranularity = useCallback((granularity: TimeGranularity) => {
    setFilters((prev) => {
      // If manually switching to a coarser granularity than current drill-down, reset drill-down
      return {
        ...prev,
        granularity,
        selectedParentPeriodKey: null,
      };
    });
  }, []);

  const setMetric = useCallback((metric: TimeTrendMetric) => {
    setFilters((prev) => ({ ...prev, metric }));
  }, []);

  const setCompareToPrevious = useCallback((compareToPrevious: boolean) => {
    setFilters((prev) => ({ ...prev, compareToPrevious }));
  }, []);

  const drillDown = useCallback((periodKey: string) => {
    if (periodKey.match(/^\d{4}$/)) {
      // Drilled into Year -> switch to Quarter
      setFilters((prev) => ({
        ...prev,
        granularity: "quarter",
        selectedParentPeriodKey: periodKey,
      }));
    } else if (periodKey.match(/^\d{4}-Q\d$/)) {
      // Drilled into Quarter -> switch to Month
      setFilters((prev) => ({
        ...prev,
        granularity: "month",
        selectedParentPeriodKey: periodKey,
      }));
    } else if (periodKey.match(/^\d{4}-\d{2}$/)) {
      // Drilled into Month -> switch to Day
      setFilters((prev) => ({
        ...prev,
        granularity: "day",
        selectedParentPeriodKey: periodKey,
      }));
    }
  }, []);

  const rollUp = useCallback(() => {
    setFilters((prev) => {
      if (!prev.selectedParentPeriodKey) return prev;

      if (prev.selectedParentPeriodKey.match(/^\d{4}-\d{2}$/)) {
        // From Month scope (showing Days) -> Roll up to Quarter scope (showing Months)
        const [year, month] = prev.selectedParentPeriodKey.split("-");
        const quarterNum = Math.ceil(Number(month) / 3);
        return {
          ...prev,
          granularity: "month",
          selectedParentPeriodKey: `${year}-Q${quarterNum}`,
        };
      }

      if (prev.selectedParentPeriodKey.match(/^\d{4}-Q\d$/)) {
        // From Quarter scope (showing Months) -> Roll up to Year scope (showing Quarters)
        const [year] = prev.selectedParentPeriodKey.split("-");
        return {
          ...prev,
          granularity: "quarter",
          selectedParentPeriodKey: year,
        };
      }

      // From Year scope (showing Quarters) -> Roll up to Root (showing Years)
      return {
        ...prev,
        granularity: "year",
        selectedParentPeriodKey: null,
      };
    });
  }, []);

  const jumpToBreadcrumb = useCallback((index: number) => {
    setFilters((prev) => {
      if (!data || index <= 0) {
        return {
          ...prev,
          granularity: "year",
          selectedParentPeriodKey: null,
        };
      }

      const target = data.breadcrumbs[index];
      if (!target) return prev;

      return {
        ...prev,
        granularity: target.granularity === "root" ? "year" : target.granularity,
        selectedParentPeriodKey: target.granularity === "root" ? null : target.periodKey,
      };
    });
  }, [data]);

  const resetHierarchy = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      granularity: "year",
      selectedParentPeriodKey: null,
    }));
  }, []);

  return {
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
  };
}
