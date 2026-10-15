import { getOverviewMockData } from "@/data/overviewMockData";
import type { OverviewData, OverviewQuery } from "@/types/overview";

/**
 * Single data-access point for the Overview page. Components never import mock
 * data or call fetch directly.
 *
 * Future integration: replace the body with
 *   GET /api/analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=month
 * The backend validates filters and maps them to predefined SQL — never send SQL.
 */
export async function fetchOverview(query: OverviewQuery): Promise<OverviewData> {
  return getOverviewMockData(query);
}
