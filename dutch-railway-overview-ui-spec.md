# Dutch Railway — Overview Dashboard UI Specification

## 1. Project Context

**Application name:** Dutch Railway  
**Page:** Overview  
**Purpose:** Build the landing dashboard for an OLAP-powered railway operations analysis application. The dashboard should help users quickly understand railway service reliability, delays, cancellations, and changes over time, then navigate to more detailed analysis.

This is a frontend design and implementation task. Use mock data initially. Do not assume the actual ETL data has already been connected to the UI.

## 2. Existing Technology Stack

Use the following stack and stay consistent with it:

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

For this task, focus on the frontend Overview page. Do not build the backend, database, or ETL pipeline.

## 3. Primary Design Goal

Create a polished, modern railway analytics dashboard that feels appropriate for an operations-intelligence product: data-dense but readable, professional, restrained, and easy to scan.

The dashboard should prioritize:
1. Current-period operational summary
2. Delay and cancellation patterns
3. Reliability trends over time
4. Operator comparison
5. Stations with the largest observed delays
6. Clear entry points into deeper OLAP analysis

Use a consistent design system. Prefer a light dashboard theme with a neutral background, white or near-white cards, dark slate text, subtle borders, restrained railway-inspired green accents, and amber/red only for meaningful warnings. Avoid excessive gradients, glassmorphism, oversized headings, decorative animations, and unnecessary visual clutter.

## 4. Layout and Navigation

Build a responsive application shell.

### Sidebar

A fixed or sticky left sidebar on desktop, collapsible on smaller screens.

- Product name: **Dutch Railway**
- Small railway/train icon
- Navigation items:
  - Overview (active)
  - Time & Trend Analysis
  - Operator & Station Analysis
  - OLAP Explorer
- A subtle divider before optional bottom items:
  - Data / Dataset Status
  - Settings (may be a non-functional placeholder for now)

Only the Overview page must be implemented in this task. Other navigation items may be present as clearly styled navigation placeholders, but do not build their pages.

Use lucide-react icons, such as `LayoutDashboard`, `ChartNoAxesCombined` or a suitable chart icon, `Building2`, `PanelsTopLeft`, `Database`, and `Settings`. Confirm icon names available in the installed lucide-react version.

### Main header

At the top of the content area, include:
- Page title: **Overview**
- Brief subtitle: “A high-level view of railway service reliability and performance.”
- A date-range control with a sensible default range for mock data
- A refresh button/icon with an accessible label
- Optional “Last updated” timestamp, clearly marked as mock/demo data when appropriate

Do not use the current date to imply that the sample dataset is up to date. If displaying a data timestamp, label it as a demo timestamp.

### Main content width

Use a spacious, responsive grid with consistent spacing. Avoid making cards excessively tall. The page should remain useful at laptop and desktop widths, and gracefully stack on mobile.

## 5. Dashboard Content

### A. KPI summary cards

Place four KPI cards near the top of the dashboard:

1. **Average Departure Delay**
   - Value with unit in minutes
   - Optional change versus the previous equivalent period
   - Use a small clock/trending icon
   - Tooltip or helper text should explain that this is based on stop-level departure-delay observations with valid values, unless the final data model defines a different grain.

2. **Services Operated**
   - Count of distinct services in the selected period
   - Do not count every stop row as a separate service.
   - Use a train icon.

3. **Cancellation Rate**
   - Percentage, with a tooltip explaining its denominator
   - For a service-level rate, calculate from distinct services and the defined service cancellation rule—not raw stop rows.
   - Use a suitable alert or ban icon.

4. **Stations Observed**
   - Count of distinct stations represented in the selected period
   - Use a station/map-pin icon.

For each card:
- Clear label
- Large but not oversized value
- Optional small comparison text
- Small icon with a subtle tinted background
- Accessible tooltip/helper description for the metric definition

**Important:** All displayed values are mock values until connected to actual queries. Do not claim that the values are real Dutch railway statistics. Include a subtle “Demo data” or “Illustrative data” label somewhere visible on the page.

### B. Delay trend chart

A wide card titled **Delay Trend**.

- Use a Recharts line chart or area chart.
- X-axis: time period.
- Y-axis: average departure delay, in minutes.
- Show a tooltip with the selected period, average delay, and relevant observation count.
- Use a restrained green line and light fill if using an area chart.
- Include a compact granularity selector with options such as Day, Month, and Year. The UI can update the chart using mock data.
- Include a short description: “Average departure delay across the selected period.”
- Include accessible labels and readable axis ticks.
- Avoid implying that a trend is statistically meaningful when using mock data.

This chart should be the main visual focus of the page.

### C. Service reliability / cancellation chart

A separate card titled **Service Outcomes** or **Cancellations Over Time**.

Recommended initial visualization:
- A Recharts bar chart displaying cancellation rate by period, or a composed chart if it remains easy to interpret.
- Keep the chart visually distinct from the delay trend.
- Tooltip should show the period, cancelled services, total distinct services, and cancellation rate when those mock fields are available.
- Do not mix service counts and stop counts without explicitly labeling the units.

If the chart would be clearer as two simple series, prefer clarity over chart complexity.

### D. Operator comparison

A card titled **Operator Performance**.

- Display a compact horizontal bar chart ranking a handful of operators by average departure delay, or a small table with operator, average delay, distinct services, and cancellation rate.
- Prefer a horizontal bar chart if labels fit cleanly.
- Allow the user to sort by average delay or cancellation rate if practical.
- Make it clear that average delay is a stop-level measure if it is calculated from stop observations.
- Do not label the “best” or “worst” operator unless the ranking metric and data completeness support that interpretation.

### E. Stations with the highest average departure delay

A card titled **Stations to Review** or **Highest-Delay Stations**.

Display a compact table with:
- Rank
- Station name
- Average departure delay (minutes)
- Number of valid delay observations

Requirements:
- Use shadcn/ui table components if already configured; otherwise accessible semantic HTML is acceptable.
- Align numeric values consistently.
- Show a clear empty state if there is no data.
- Do not imply that a station causes delays; this table only identifies stations with high observed average departure delays.
- Use mock station names and numbers only for design purposes. Keep mock content easy to replace.

### F. Quick links to deeper analysis

At the bottom or in a secondary row, include a small “Explore further” section with links/cards for:
- **Time & Trend Analysis** — inspect reliability at different time granularities
- **Operator & Station Analysis** — compare performance by operator and station
- **OLAP Explorer** — choose dimensions and measures for roll-up, drill-down, slice, dice, and pivot analysis

These may point to placeholder routes or use clearly marked disabled/placeholder behavior if routing is not configured. Do not make controls look interactive unless they perform an action.

## 6. Global Filters and Interaction

For the Overview page, implement these interactions with local state and mock data:

- Date range selector or date-range presets
- Chart granularity selector (Day / Month / Year)
- Refresh button that refreshes or re-selects the current mock data state without falsely claiming to reload server data
- Tooltips for metric definitions
- Responsive sidebar toggle on smaller screens
- Hover and focus states for interactive controls

If a full date-range picker is too complex for the first pass, use a shadcn/ui Select with useful presets such as:
- Last 7 days
- Last 30 days
- Last 3 months
- Last 12 months
- All available data

Changing filters should update the visible mock metrics/charts consistently where practical. Do not leave controls inert.

## 7. Data and TypeScript Requirements

Create typed mock data and separate it from presentational components. Suggested TypeScript types:

```ts
type DateRangePreset =
  | "last-7-days"
  | "last-30-days"
  | "last-3-months"
  | "last-12-months"
  | "all-data";

type Granularity = "day" | "month" | "year";

type OverviewMetrics = {
  averageDepartureDelayMinutes: number | null;
  distinctServiceCount: number;
  cancellationRate: number | null;
  distinctStationCount: number;
};

type DelayTrendPoint = {
  period: string;
  averageDepartureDelayMinutes: number | null;
  validDelayObservationCount: number;
};

type CancellationTrendPoint = {
  period: string;
  cancelledServiceCount: number;
  distinctServiceCount: number;
  cancellationRate: number | null;
};

type OperatorPerformance = {
  operator: string;
  averageDepartureDelayMinutes: number | null;
  distinctServiceCount: number;
  cancellationRate: number | null;
};

type StationDelay = {
  stationName: string;
  averageDepartureDelayMinutes: number | null;
  validDelayObservationCount: number;
};
```

You may adjust these types to fit the actual dataset later, but keep the units and aggregation grain explicit in field names.

Create a mock-data module such as `src/data/overviewMockData.ts`. Keep mock data separate from JSX so it can be replaced by API responses without rewriting the layout.

Do not use `any` unless absolutely unavoidable. Use safe formatting helpers for null values, numbers, percentages, and minutes.

## 8. Data Semantics and Analytical Correctness

The source is the Dutch Railway dataset documented by DuckDB. The final source fields and row grain must be confirmed against the actual loaded dataset before connecting the real API.

Follow these rules in the UI and mock data design:
- **Stop-level measures:** departure-delay averages should be clearly described as averages over valid stop-level observations if that is how the source is structured.
- **Service-level measures:** services operated and cancellation rates should use distinct service identifiers and an explicitly defined cancellation rule.
- Do not calculate service counts by counting stop records.
- Do not treat every stop with a cancellation-related flag as a separate cancelled service.
- Exclude null delay values from delay averages and expose the valid observation count when useful.
- Display units explicitly, especially minutes and percentages.
- If a metric cannot be calculated, display “—” or “N/A” instead of inventing a value.
- Mock comparisons must be identified as illustrative; do not make factual claims about real operators or stations.

For now, these are UI contracts, not final SQL definitions. Final formulas should be agreed with the actual data schema before integration.

## 9. API Integration Readiness

Do not implement the API in this task. Structure the frontend so mock data can later be replaced by a typed service module.

Potential future endpoint:
`GET /api/analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=month`

Possible response sections:
- `metrics`
- `delayTrend`
- `cancellationTrend`
- `operatorPerformance`
- `highestDelayStations`

Keep API calls out of the visual components. When integration begins, use a dedicated service module and handle loading, error, and empty states.

The frontend must never send arbitrary SQL to the backend. Filters should be validated by the API and translated to predefined SQL queries.

## 10. Loading, Error, and Empty States

Design these states even if the first pass uses mock data:
- Loading skeletons for KPI cards and charts
- A visible, concise error state with a retry action
- Empty-state message when no rows match a filter
- Null metric display using “—” or “N/A”
- A small demo-data indicator while mock data is active

Avoid fake loading delays. Do not show a perpetual spinner.

## 11. Accessibility and Responsive Design

- Use semantic headings and landmarks.
- Every icon-only button must have an accessible name.
- Maintain keyboard focus visibility.
- Use sufficient text/background contrast.
- Do not rely on red/green alone to convey meaning.
- Ensure chart cards have descriptive titles and supporting text; provide textual summaries or tables where appropriate.
- At tablet and mobile widths, stack chart cards and allow the sidebar to collapse.
- Tables should remain readable and not force the whole page to overflow horizontally.
- Respect reduced-motion preferences if animation is used.

## 12. Suggested Component Structure

Organize the code into reusable components. Adjust to the repository's conventions where needed.

```text
src/
  components/
    layout/
      AppSidebar.tsx
      AppHeader.tsx
      MobileSidebar.tsx
    overview/
      OverviewKpiCard.tsx
      DelayTrendChart.tsx
      CancellationTrendChart.tsx
      OperatorPerformanceCard.tsx
      HighestDelayStationsTable.tsx
      ExploreFurtherCards.tsx
      ChartCard.tsx
    ui/
      # shadcn/ui-generated components
  data/
    overviewMockData.ts
  services/
    # Future API service module; may remain empty for now
  types/
    overview.ts
  lib/
    formatters.ts
  pages/
    OverviewPage.tsx
  App.tsx
  main.tsx
```

Do not duplicate shadcn/ui components if they are already generated in the project. Use the existing import aliases and project configuration.

## 13. Definition of Done

The task is complete when:
- The Overview page runs in the existing React + Vite + TypeScript app.
- The layout includes the sidebar, header, KPI cards, delay trend, cancellation visualization, operator comparison, highest-delay station table, and quick links.
- The UI uses Tailwind CSS, shadcn/ui where appropriate, lucide-react icons, and Recharts.
- Mock data is typed and stored separately from presentation components.
- Filters and granularity controls visibly affect the mock dashboard where practical.
- Loading, error, empty, and null-value states are considered.
- The page is responsive and keyboard-accessible.
- All mock data is clearly labeled as illustrative.
- No backend, database, or ETL work is added.
- No metric is presented as a real-world statistic before the actual data is connected and definitions are validated.

## 14. Final Implementation Instructions

Before coding:
1. Inspect the existing repository and reuse its current setup.
2. Check whether Tailwind, shadcn/ui, lucide-react, and Recharts are already installed.
3. Avoid replacing project configuration unnecessarily.
4. Implement the Overview page and supporting components.
5. Run the existing lint, type-check, test, and build scripts where available.
6. Summarize the files changed and any setup steps that remain.

**Design direction in one sentence:** Build a clean, professional railway operations dashboard with a strong visual hierarchy, reliable metric definitions, and a mock-data architecture that is easy to connect to the real Dutch Railway dataset later.
