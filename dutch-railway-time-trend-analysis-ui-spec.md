# Dutch Railway — Time & Trend Analysis UI Specification

## 1. Project Context

**Application name:** Dutch Railway  
**Page:** Time & Trend Analysis  
**Purpose:** Build the temporal OLAP analysis page for the Dutch Railway operations application. This page allows users to investigate railway service reliability, departure delays, and cancellations across a multi-level time hierarchy (`Year → Quarter → Month → Day`) using interactive **Roll-up** and **Drill-down** operations.

This is a frontend design and implementation task. Use typed mock data initially so frontend development can proceed before connecting the actual analytical SQL queries.

## 2. Existing Technology Stack

Use the following stack and stay consistent with the Overview page implementation:

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS
- **UI components:** shadcn/ui
- **Charts:** Recharts
- **Icons:** lucide-react
- **Backend planned:** Fastify + TypeScript
- **Database planned:** PostgreSQL 17
- **Database access:** `pg` with raw SQL
- **ETL:** Python + Pandas + psycopg
- **Local services:** Docker Compose
- **Database GUI:** DBeaver
- **Testing:** pytest + Vitest
- **Performance analysis:** PostgreSQL `EXPLAIN ANALYZE`

For this task, focus on the frontend Time & Trend Analysis page. Do not build or modify the backend, database, or ETL pipeline.

## 3. Primary Design Goal

Create a clean, data-dense temporal analysis workspace that matches the visual language of the Overview dashboard:

1. **Interactive hierarchical exploration:** Support seamless OLAP **Roll-up** and **Drill-down** across `Year → Quarter → Month → Day`.
2. **Synchronized visual context:** Keep the hierarchy breadcrumb, selected-period summary cards, trend charts, and period breakdown table updated together whenever the user drills down or rolls up.
3. **Configurable metric inspection:** Allow users to switch primary metrics and optionally compare performance against a previous equivalent period.
4. **Analytical clarity:** Preserve the distinction between stop-level departure-delay measurements and service-level counts/cancellation rates.

Use the same light dashboard theme established on the Overview page: neutral background, white or near-white cards, dark slate text, subtle borders, restrained railway-inspired green accents, and amber/red reserved for meaningful warnings. Avoid excessive gradients, glassmorphism, oversized headings, decorative animations, and visual clutter.

## 4. Layout and Navigation

Reuse the responsive application shell (`AppSidebar`, `AppHeader`, and `MobileSidebar`) from the Overview page.

### Sidebar

A fixed or sticky left sidebar on desktop, collapsible on smaller screens:

- Product name: **Dutch Railway**
- Small railway/train icon
- Navigation items:
  - Overview
  - Time & Trend Analysis (active)
  - Operator & Station Analysis (or routed as predefined templates inside OLAP Explorer, matching the project's active router configuration)
  - OLAP Explorer
- A subtle divider before optional bottom items:
  - Data / Dataset Status
  - Settings (non-functional placeholder for now)

Use `lucide-react` icons consistent with the Overview page (`LayoutDashboard`, `ChartNoAxesCombined`, `Building2`, `PanelsTopLeft`, `Database`, `Settings`).

### Main header

At the top of the content area, include:
- Page title: **Time & Trend Analysis**
- Brief subtitle: “Analyze railway reliability and delay trends across yearly, quarterly, monthly, and daily hierarchies.”
- A date-range control with sensible presets for the mock dataset
- A refresh button/icon with an accessible label
- Optional “Last updated” timestamp, clearly marked as mock/demo data

Do not use the current date to imply that the sample dataset is live. Include a visible “Demo data” or “Illustrative data” badge in the header or top toolbar.

### Main content width

Use the same responsive grid and spacing system as the Overview page so switching between pages feels seamless across desktop, tablet, and mobile viewports.

## 5. Page Content

### A. OLAP Hierarchy Breadcrumb & Scope Bar

Place a dedicated hierarchy bar directly below the page header to make the **Roll-up** and **Drill-down** state explicit:

- **Hierarchy path breadcrumb:**
  - Root (`Year` level): `All Years`
  - Drilled into a Year (`Quarter` level): `All Years / 2024`
  - Drilled into a Quarter (`Month` level): `All Years / 2024 / 2024 Q3`
  - Drilled into a Month (`Day` level): `All Years / 2024 / 2024 Q3 / August 2024`
- **Roll-up controls:**
  - Clicking any parent item in the breadcrumb rolls up to that hierarchy level.
  - Provide an explicit **Roll Up** button (disabled at the root `Year` level) to move one level up the hierarchy (`Day → Month → Quarter → Year`).
  - Provide a **Reset to Years** action when drilled down.
- **Active scope indicator:** Display a concise text badge showing the current parent scope and child granularity (e.g., `Viewing Months in 2024 Q3 — Select a month to drill down to Days`).

### B. Filters and Controls Toolbar

Provide an interactive control bar with:

1. **Date Range Selector:**
   - Presets such as `Last 30 days`, `Last 3 months`, `Last 6 months`, `Last 12 months`, and `All available data`.
2. **Time Granularity Selector:**
   - Options: `Year`, `Quarter`, `Month`, `Day`.
   - Changing granularity directly updates the aggregation level across the active scope, while drilling down scopes the view to a specific parent period's children.
3. **Metric Selector:**
   - Controls the primary metric displayed in the main Performance Over Time chart:
     - **Average departure delay** (minutes)
     - **Cancellation rate** (%)
     - **Distinct services** (count)
     - **Valid departure-delay observations** (count)
4. **Comparison Toggle:**
   - Optional switch: **Compare to previous equivalent period**.
   - When enabled, displays period-over-period delta indicators on the summary cards and an optional comparison series or reference indicator in the main chart.

### C. Summary Cards

Place four summary cards below the controls bar, reflecting the **rolled-up aggregate** for the currently selected period scope:

1. **Average Departure Delay**
   - Value with unit in minutes (`min`).
   - Optional comparison change vs. previous equivalent period when comparison mode is enabled.
   - Tooltip explaining that this is calculated from valid stop-level departure-delay observations (`SUM(delay) / COUNT(valid_observations)`), not an unweighted average of period averages.
2. **Cancellation Rate**
   - Percentage (`%`) with tooltip explaining its service-level denominator.
   - Calculated from distinct cancelled services divided by total distinct services in the selected scope.
3. **Services Observed**
   - Count of distinct train services operated in the selected period scope.
   - Tooltip clarifying that each service is counted once rather than per station stop.
4. **Valid Delay Observations**
   - Count of non-null stop-level departure-delay observations in the selected scope.
   - Tooltip explaining that this represents the sample size backing the average departure delay calculation.

### D. Main Performance Over Time Chart

A wide, primary card titled **Performance Over Time**:

- Use a Recharts `AreaChart`, `LineChart`, or `BarChart` (using restrained railway-green styling consistent with the Overview page).
- **X-axis:** Child periods of the current hierarchy level (`Year`, `Quarter`, `Month`, or `Day`).
- **Y-axis:** Dynamically labeled and formatted according to the active Metric Selector (`minutes`, `%`, or count).
- **Interactive Drill-down:** Clicking a data point or bar when at `Year`, `Quarter`, or `Month` level drills down into that period's child records.
- **Tooltip:** Displays the period label, selected metric value with explicit units, underlying observation or service count, previous-period value (if comparison is enabled), and a hint when clicking will drill down.
- **Helper subtitle:** Dynamically reflects the active metric and hierarchy level (e.g., *“Average stop-level departure delay by Month in 2024 Q3. Click a period to drill down.”*).

### E. Cancellation Trend Chart

A secondary card titled **Cancellation Trend**:

- Use a Recharts `BarChart` or `ComposedChart` displaying the service-level cancellation rate (`%`) across the active child periods.
- Keep the visual palette distinct from the main delay chart (e.g., slate/amber tones).
- **Tooltip:** Displays the period, cancelled service count, total distinct service count, and cancellation rate (`%`).
- **Interaction:** Clicking a period bar also drills down into its child periods if finer granularity is available.

### F. Delay-Observation Volume Chart (Optional / Companion Card)

A companion secondary card titled **Valid Delay Observation Volume**:

- Use a Recharts `BarChart` or `AreaChart` showing `validDelayObservationCount` (and optionally `distinctServiceCount` with clear unit separation) across the current periods.
- Helps users evaluate whether extreme delay averages coincide with small observation counts or peak service volume.
- Explicitly label stop-level observation counts vs. service-level counts so the two grains are never confused.

### G. Period Breakdown Table

A full-width table card titled **Period Breakdown**:

- Uses shadcn/ui `Table` components (or accessible semantic table markup).
- **Columns:**
  - **Period** (label for the Year, Quarter, Month, or Day)
  - **Distinct Services** (right-aligned integer)
  - **Cancelled Services** (right-aligned integer)
  - **Cancellation Rate** (right-aligned percentage)
  - **Valid Delay Observations** (right-aligned integer)
  - **Average Departure Delay** (right-aligned minutes)
  - **Action** (`Drill down` button for `Year`, `Quarter`, and `Month` rows; muted `Leaf level (Day)` indicator for `Day` rows)
- **Rolled-Up Summary Footer:**
  - Include a sticky or highlighted footer row showing the **Rolled-Up Summary** across all visible rows in the current scope.
  - Calculate the footer's **Average Departure Delay** using weighted aggregation (`totalDepartureDelayMinutes / validDelayObservationCount`) and **Cancellation Rate** using recalculated service counts (`cancelledServiceCount / distinctServiceCount * 100`).

## 6. OLAP Hierarchy and Interaction Requirements

The page must demonstrate real hierarchical **Roll-up** and **Drill-down** behavior:

- **Supported Hierarchy:** `Year → Quarter → Month → Day`
- **Drill-down flow:**
  1. Selecting a `Year` (e.g., `2024`) from the chart or table sets `granularity = "quarter"` and scopes data to `2024` (`2024 Q1` – `2024 Q4`).
  2. Selecting a `Quarter` (e.g., `2024 Q3`) sets `granularity = "month"` and scopes data to the months in `2024 Q3` (`Jul 2024`, `Aug 2024`, `Sep 2024`).
  3. Selecting a `Month` (e.g., `Aug 2024`) sets `granularity = "day"` and scopes data to individual days in `Aug 2024`.
- **Roll-up flow:**
  - Clicking **Roll Up** or selecting an ancestor in the breadcrumb reverses the path (`Day → Month → Quarter → Year`), re-aggregating child metrics into parent totals.
- **Synchronized updates:**
  - Every drill-down, roll-up, granularity change, metric switch, or date-range filter change must update the breadcrumb, summary cards, charts, and breakdown table together.

## 7. Data and TypeScript Requirements

Create typed mock data and separate it from presentational components. Suggested TypeScript types in `src/types/timeTrend.ts`:

```ts
export type DateRangePreset =
  | "last-7-days"
  | "last-30-days"
  | "last-3-months"
  | "last-12-months"
  | "all-data";

export type TimeGranularity = "year" | "quarter" | "month" | "day";

export type TimeTrendMetric =
  | "averageDepartureDelayMinutes"
  | "cancellationRate"
  | "distinctServiceCount"
  | "validDelayObservationCount";

export type HierarchyBreadcrumb = {
  granularity: TimeGranularity;
  periodKey: string;
  label: string;
};

export type TimeTrendPoint = {
  periodKey: string; // e.g., "2024", "2024-Q3", "2024-08", "2024-08-14"
  label: string;
  granularity: TimeGranularity;
  parentPeriodKey: string | null;
  distinctServiceCount: number;
  cancelledServiceCount: number;
  cancellationRate: number | null;
  validDelayObservationCount: number;
  totalDepartureDelayMinutes: number;
  averageDepartureDelayMinutes: number | null;
  previousPeriodAverageDelayMinutes?: number | null;
  previousPeriodCancellationRate?: number | null;
};

export type TimeTrendSummary = {
  scopeLabel: string;
  distinctServiceCount: number;
  cancelledServiceCount: number;
  cancellationRate: number | null;
  validDelayObservationCount: number;
  totalDepartureDelayMinutes: number;
  averageDepartureDelayMinutes: number | null;
  previousPeriodAverageDelayMinutes?: number | null;
  previousPeriodCancellationRate?: number | null;
};

export type TimeTrendFilterState = {
  dateRange: DateRangePreset;
  granularity: TimeGranularity;
  metric: TimeTrendMetric;
  selectedParentPeriodKey: string | null;
  compareToPrevious: boolean;
};