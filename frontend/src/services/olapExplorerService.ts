import { executeOlapQuery } from "@/data/olapExplorerMockData";
import type { OlapQueryConfig, OlapQueryResult } from "@/types/olapExplorer";

/**
 * Service module boundary for OLAP Explorer queries.
 *
 * Future integration:
 * Replace this mock execution with a typed HTTP request:
 *   POST /api/analytics/olap/query
 *   Body: OlapQueryConfig
 * The backend validates dimensions, measures, and filters against the PostgreSQL schema,
 * executing optimized ROLLUP/CUBE/GROUPING SETS and PIVOT queries.
 */
export async function fetchOlapQuery(config: OlapQueryConfig): Promise<OlapQueryResult> {
  return executeOlapQuery(config);
}
