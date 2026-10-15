import { useCallback, useEffect, useState } from "react";

import type { AsyncStatus } from "@/components/overview/ChartCard";
import {
  EMPTY_FILTERS,
  PREDEFINED_TEMPLATES,
} from "@/data/olapExplorerMockData";
import { fetchOlapQuery } from "@/services/olapExplorerService";
import type {
  OlapDimension,
  OlapFilterState,
  OlapMeasure,
  OlapQueryConfig,
  OlapQueryResult,
  OlapSortOption,
} from "@/types/olapExplorer";

const INITIAL_CONFIG: OlapQueryConfig = PREDEFINED_TEMPLATES[0].config;

type Result = { key: string; data: OlapQueryResult | null; error: Error | null };

export type OlapExplorerHookState = {
  status: AsyncStatus;
  data: OlapQueryResult | null;
  config: OlapQueryConfig;
  loadTemplate: (templateId: string) => void;
  setRowDimension: (dim: OlapDimension) => void;
  setColumnDimension: (dim: OlapDimension | null) => void;
  swapDimensions: () => void;
  setMeasure: (measure: OlapMeasure) => void;
  setFilterValues: (dimension: keyof OlapFilterState, values: string[]) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: OlapSortOption) => void;
  refresh: () => void;
};

export function useOlapExplorerData(): OlapExplorerHookState {
  const [config, setConfig] = useState<OlapQueryConfig>(INITIAL_CONFIG);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [lastData, setLastData] = useState<OlapQueryResult | null>(null);

  const key = `${config.templateId}|${config.rowDimension}|${config.columnDimension}|${config.measure}|${config.sortBy}|${JSON.stringify(config.filters)}|${nonce}`;

  useEffect(() => {
    let cancelled = false;

    fetchOlapQuery(config).then(
      (res) => {
        if (cancelled) return;
        setResult({ key, data: res, error: null });
        setLastData(res);
      },
      (error: unknown) => {
        if (cancelled) return;
        setResult({
          key,
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const loadTemplate = useCallback((templateId: string) => {
    const t = PREDEFINED_TEMPLATES.find((tmpl) => tmpl.id === templateId);
    if (t) {
      setConfig({ ...t.config });
    }
  }, []);

  const setRowDimension = useCallback((dim: OlapDimension) => {
    setConfig((prev) => {
      // If new row dimension equals column dimension, swap or reset column dimension
      const newCol = prev.columnDimension === dim ? (prev.rowDimension !== dim ? prev.rowDimension : null) : prev.columnDimension;
      return {
        ...prev,
        templateId: null,
        rowDimension: dim,
        columnDimension: newCol,
      };
    });
  }, []);

  const setColumnDimension = useCallback((dim: OlapDimension | null) => {
    setConfig((prev) => {
      if (dim === null) {
        return { ...prev, templateId: null, columnDimension: null };
      }
      // If new column dimension equals row dimension, swap them
      const newRow = prev.rowDimension === dim ? prev.columnDimension ?? "operator" : prev.rowDimension;
      return {
        ...prev,
        templateId: null,
        rowDimension: newRow,
        columnDimension: dim,
      };
    });
  }, []);

  const swapDimensions = useCallback(() => {
    setConfig((prev) => {
      if (!prev.columnDimension) return prev;
      return {
        ...prev,
        templateId: null,
        rowDimension: prev.columnDimension,
        columnDimension: prev.rowDimension,
      };
    });
  }, []);

  const setMeasure = useCallback((measure: OlapMeasure) => {
    setConfig((prev) => ({
      ...prev,
      templateId: null,
      measure,
    }));
  }, []);

  const setFilterValues = useCallback((dimension: keyof OlapFilterState, values: string[]) => {
    setConfig((prev) => ({
      ...prev,
      templateId: null,
      filters: {
        ...prev.filters,
        [dimension]: values,
      },
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      templateId: null,
      filters: EMPTY_FILTERS,
    }));
  }, []);

  const setSortBy = useCallback((sortBy: OlapSortOption) => {
    setConfig((prev) => ({ ...prev, sortBy }));
  }, []);

  const status: AsyncStatus = result?.key !== key ? "loading" : result.error ? "error" : "success";
  const data = status === "error" ? null : (result?.data ?? lastData);

  return {
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
  };
}
