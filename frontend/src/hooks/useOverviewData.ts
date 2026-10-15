import { useCallback, useEffect, useState } from "react";

import type { AsyncStatus } from "@/components/overview/ChartCard";
import { fetchOverview } from "@/services/overviewService";
import type { OverviewData, OverviewQuery } from "@/types/overview";

type Result = { key: string; data: OverviewData | null; error: Error | null };

export type OverviewDataState = {
  status: AsyncStatus;
  /** Most recent successful data; kept while a new request is in flight. */
  data: OverviewData | null;
  refresh: () => void;
};

/** Loads Overview data via the service layer and exposes loading/error/success. */
export function useOverviewData(query: OverviewQuery): OverviewDataState {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [lastData, setLastData] = useState<OverviewData | null>(null);
  const key = `${query.dateRange}|${query.granularity}|${nonce}`;

  useEffect(() => {
    let cancelled = false;
    fetchOverview(query).then(
      (data) => {
        if (cancelled) return;
        setResult({ key, data, error: null });
        setLastData(data);
      },
      (error: unknown) => {
        if (cancelled) return;
        setResult({ key, data: null, error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => {
      cancelled = true;
    };
    // `key` fully captures `query` and the refresh nonce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const status: AsyncStatus = result?.key !== key ? "loading" : result.error ? "error" : "success";
  return { status, data: status === "error" ? null : (result?.data ?? lastData), refresh };
}
