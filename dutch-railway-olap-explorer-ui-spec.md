# Dutch Railway — OLAP Explorer UI Specification

## 1. Project Context

**Application name:** Dutch Railway  
**Page:** OLAP Explorer  
**Purpose:** Build the configurable multi-dimensional OLAP reporting workspace for the Dutch Railway operations application. This page enables users to dynamically choose dimensions, measures, filters, and row/column orientations to perform **Slice**, **Dice**, and **Pivot** operations, while also providing predefined report templates for **Operator & Station Analysis**.

This is a frontend design and implementation task that uses typed mock data initially so frontend development can proceed before connecting the actual ETL data and backend SQL queries.

## 2. Existing Technology Stack

Use the following stack and stay consistent with the Overview and Time & Trend Analysis pages:

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

For this task, focus strictly on the frontend OLAP Explorer page and its supporting state/calculation modules; do not build the backend, database, or ETL pipeline.

## 3. Primary Design Goal

Create a flexible, intuitive OLAP query and reporting interface that matches the clean operations-intelligence aesthetic of the Overview dashboard:

1. **Demonstrable Slice, Dice, and Pivot operations:** Make each OLAP operation explicit, configurable, and visually verifiable through active operation badges, dynamic pivot matrices, and responsive charts.
2. **Predefined Operator & Station Analysis templates:** Provide one-click report presets so users can immediately inspect operator reliability and station delay rankings without building a query from scratch.
3. **Dynamic report generation:** Allow users to select row dimensions, column (pivot) dimensions, measures, and dimension filters, then immediately view updated summary metrics, charts, and cross-tabulated tables.
4. **Strict analytical correctness:** Maintain the distinction between stop-level departure-delay averages and service-level counts/cancellation rates across all slices, dices, and pivot totals.

Use the same light dashboard theme as the Overview page: a neutral background, white or near-white cards, dark slate text, subtle borders, restrained railway-inspired green accents, and amber/red reserved for meaningful warnings. Avoid excessive gradients, glassmorphism, oversized headings, decorative animations, and unnecessary visual clutter.

## 4. Layout and Navigation

Reuse the responsive application shell (`AppSidebar`, `AppHeader`, and `MobileSidebar`) established on the Overview page.

### Sidebar

A fixed or sticky left sidebar on desktop, collapsible on smaller screens:

- Product name: **Dutch Railway**
- Small railway/train icon
- Navigation items:
  - Overview
  - Time & Trend Analysis
  - Operator & Station Analysis (may route directly to the Operator & Station predefined templates inside the OLAP Explorer, or remain consistent with the project's router)
  - OLAP Explorer (active)
- A subtle divider before optional bottom items:
  - Data / Dataset Status
  - Settings (non-functional placeholder for now)

Use `lucide-react` icons consistent with the Overview page (`LayoutDashboard`, `ChartNoAxesCombined`, `Building2`, `PanelsTopLeft`, `Database`, `Settings`).

### Main header

At the top of the content area, include:
- Page title: **OLAP Explorer**[cite: 1]
- Brief subtitle: “Configure dimensions, measures, filters, and pivot layouts for multi-dimensional railway analysis.”
- A date-range control with sensible presets for the mock dataset[cite: 1]
- A refresh/reset button with an accessible label[cite: 1]
- Optional “Last updated” timestamp, clearly marked as mock/demo data[cite: 1]

Do not use the current date to imply that the sample dataset is up to date[cite: 1]. Display a subtle “Demo data” or “Illustrative data” badge in the header[cite: 1].

### Main content width

Use a spacious, responsive grid with consistent spacing that remains readable at laptop and desktop widths and stacks cleanly on mobile[cite: 1].

## 5. OLAP Explorer Content

### A. Predefined Report Templates (Including Operator & Station Analysis)

At the top of the workspace, display a compact **Report Templates** bar (`Quick Templates`) so users can load meaningful railway analyses with one click:

1. **Operator × Month Delay Matrix (Pivot + Slice)**
   - **Row Dimension:** `Operator`
   - **Column Dimension (Pivot):** `Month`
   - **Measure:** `Average Departure Delay (minutes)`[cite: 1]
   - **Slice Filter:** `Year = 2024`
2. **Operator Performance Comparison (Operator Analysis Template)**
   - **Row Dimension:** `Operator`[cite: 1]
   - **Column Dimension:** `None (Multi-Metric Summary Table)`
   - **Measure:** `Average Departure Delay (minutes)` and `Cancellation Rate (%)`[cite: 1]
   - Replaces the need for a separate static Operator page by showing operator rankings, service counts, cancellation rates, and stop-level delay averages[cite: 1].
3. **Highest-Delay Stations by Service Type (Station Analysis + Dice Template)**
   - **Row Dimension:** `Station`[cite: 1]
   - **Column Dimension (Pivot):** `Service Type`
   - **Measure:** `Average Departure Delay (minutes)`[cite: 1]
   - **Dice Filter:** Selected major stations and service types within a specified date range.
4. **Service Type × Quarter Cancellation Matrix (Pivot)**
   - **Row Dimension:** `Service Type`
   - **Column Dimension (Pivot):** `Quarter`
   - **Measure:** `Cancellation Rate (%)`[cite: 1]

Selecting a template populates the query builder controls below and immediately updates the report output.Users can then modify any filter, dimension, or measure freely.

### B. OLAP Query Configuration Panel (Dimensions, Measures & Pivot)

Provide a structured configuration card organized into clear control groups:

1. **Report Mode Toggle:**
   - **Grouped Report (Tabular + Chart):** Groups data by 1 or 2 dimensions and displays all core measures side by side.
   - **Pivot Matrix (Cross-Tabulation):** Reorients one dimension onto rows and a second dimension onto columns for a chosen single measure.
2. **Row Dimension Selector (`Rows / Group By`):**
   - Supported dimensions: `Operator`, `Station`, `Service Type`, `Year`, `Quarter`, `Month`.
3. **Column Dimension Selector (`Columns / Pivot By`):**
   - Supported dimensions: `None` (in standard mode), `Month`, `Quarter`, `Year`, `Service Type`, `Operator`.
   - Prevent selecting the exact same dimension for both Row and Column simultaneously (or automatically swap them when the user clicks a **Swap Rows & Columns** button).
4. **Primary Measure Selector:**
   - `Average Departure Delay (minutes)` — stop-level weighted average[cite: 1]
   - `Cancellation Rate (%)` — service-level percentage[cite: 1]
   - `Distinct Services Operated` — service-level count[cite: 1]
   - `Valid Delay Observations` — stop-level observation count[cite: 1]

**Important rule on dimensions:** Only expose dimensions that exist in the dataset schema (`Operator`, `Station`, `Service Type`, and temporal dimensions derived from service date). Do not invent artificial hierarchies such as geographic station regions unless present in the source schema.

### C. Slice and Dice Filter Bar

Provide an explicit filter panel that distinguishes between **Slice** and **Dice** operations:

1. **Single-Dimension Slice Controls:**
   - Quick selector to lock a single dimension to one specific value (for example, `Year = 2024`, `Operator = Illustrative Rail A`, or `Service Type = Intercity`).
2. **Multi-Dimension Dice Controls:**
   - **Date Range / Year Filter:** Preset range or specific year(s)[cite: 1].
   - **Operator Multi-Select:** Filter to one or more railway operators[cite: 1].
   - **Station Multi-Select / Search:** Filter to specific stations[cite: 1].
   - **Service Type Multi-Select:** Filter to selected service categories (e.g., `Intercity`, `Sprinter`, `International`).
3. **Active OLAP Operation Status Bar:**
   - Display live status badges summarizing which OLAP operations are currently active:
     - **SLICE:** Shown when exactly one dimension is filtered to a single value (e.g., `Slice: Year = 2024`).
     - **DICE:** Shown when two or more dimensions (or multiple values + date ranges) restrict the sub-cube (e.g., `Dice: Operators (2) × Service Type (Intercity) × 2024 Q3`).
     - **PIVOT:** Shown when a Column Dimension is active (e.g., `Pivot: Operator (Rows) × Month (Columns)`).
   - Include a **Clear All Filters** button to return to the full mock dataset.

### D. Scoped Sub-Cube KPI Summary Cards

Display four summary cards reflecting the aggregated metrics for the currently filtered (sliced/diced) dataset[cite: 1]:

1. **Average Departure Delay** (`min`) — weighted stop-level average across matching records[cite: 1].
2. **Services Operated** — count of distinct services matching the active slice/dice filters[cite: 1].
3. **Cancellation Rate** (`%`) — recalculated from matching cancelled services divided by matching distinct services[cite: 1].
4. **Valid Delay Observations** — count of non-null stop-level delay observations in the filtered subset[cite: 1].

Each card must include a tooltip explaining its grain and denominator[cite: 1].

### E. Dynamic OLAP Visualization Card

A wide chart card titled dynamically based on the active query (e.g., **Average Departure Delay by Operator across Months**):

- **When in Grouped Mode:**
  - Render a Recharts horizontal or vertical `BarChart` ranking the selected Row Dimension by the active Measure[cite: 1].
  - Allow sorting by the selected measure (ascending/descending)[cite: 1].
- **When in Pivot Mode:**
  - Render a multi-series Recharts grouped `BarChart` or `LineChart` where the X-axis represents the Row Dimension (or time dimension) and series represent the pivoted Column Dimension values (capped to the top series for readability, with a legend)[cite: 1].
- **Tooltips & Labels:**
  - Show exact units (`min`, `%`, or count) and underlying observation/service counts in the custom tooltip[cite: 1].
  - Do not label any operator or station as the “best” or “worst” unless supported by the metric definition and data completeness[cite: 1].
  - Do not imply that a station causes delays; explain that station figures reflect observed departure delays at that stop[cite: 1].

### F. Dynamic Pivot Table / Grouped Analytical Table

A full-width card titled **OLAP Result Matrix** (in Pivot mode) or **Grouped Analytical Report** (in Standard mode):

1. **Pivot Mode Matrix:**
   - **Rows:** Distinct values of the selected Row Dimension (e.g., `Operator`).
   - **Columns:** Distinct values of the selected Column Dimension (e.g., `Jan`, `Feb`, `Mar`, ...).
   - **Cells:** Formatted value of the selected Measure (`Average Departure Delay`, `Cancellation Rate`, `Distinct Services`, or `Valid Observations`), with optional subtle background tinting for high values and `—` for empty cells[cite: 1].
   - **Row Totals (Rightmost Column) & Column Totals (Bottom Footer Row) & Grand Total:**
     - Must be calculated using weighted aggregation (`SUM(delay) / SUM(valid_observations)` for average delay; `SUM(cancelled) / SUM(distinct_services) * 100` for cancellation rate), never by taking an unweighted mean of row or column cells.
2. **Standard Grouped Table Mode:**
   - Displays each group row with all core analytical columns:
     - Group Dimension(s)
     - Distinct Services[cite: 1]
     - Cancelled Services[cite: 1]
     - Cancellation Rate (`%`)[cite: 1]
     - Valid Delay Observations[cite: 1]
     - Average Departure Delay (`min`)[cite: 1]
   - Includes column sorting and a weighted summary footer row.

## 6. Global Filters and Interaction

Implement these interactive behaviors using local React state and mock data[cite: 1]:

- One-click loading of predefined report templates (including Operator & Station analyses).
- Dynamic switching of Row Dimension, Column (Pivot) Dimension, and Measure.
- **Swap Rows & Columns** button to demonstrate interactive pivoting in one click.
- Slice and Dice filter controls that immediately recompute the summary cards, chart, and pivot/grouped table[cite: 1].
- Sort controls on tabular outputs[cite: 1].
- Tooltips explaining stop-level vs. service-level metric formulas and OLAP operation definitions[cite: 1].

## 7. Data and TypeScript Requirements

Keep typed mock data and OLAP aggregation/pivoting logic separate from presentational components[cite: 1]. Suggested TypeScript definitions in `src/types/olapExplorer.ts`:

```ts
export type OlapDimension =
  | "operator"
  | "station"
  | "serviceType"
  | "year"
  | "quarter"
  | "month";

export type OlapMeasure =
  | "averageDepartureDelayMinutes"
  | "cancellationRate"
  | "distinctServiceCount"
  | "validDelayObservationCount";

export type OlapFilterState = {
  years: string[];
  quarters: string[];
  months: string[];
  operators: string[];
  stations: string[];
  serviceTypes: string[];
};

export type OlapQueryConfig = {
  templateId: string | null;
  rowDimension: OlapDimension;
  columnDimension: OlapDimension | null; // non-null activates Pivot mode
  measure: OlapMeasure;
  filters: OlapFilterState;
  sortBy: "dimension" | "measure-desc" | "measure-asc";
};

export type OlapCubeCell = {
  year: string;
  quarter: string;
  month: string;
  operator: string;
  station: string;
  serviceType: string;
  distinctServiceCount: number;
  cancelledServiceCount: number;
  validDelayObservationCount: number;
  totalDepartureDelayMinutes: number;
};

export type AggregatedMeasureValues = {
  distinctServiceCount: number;
  cancelledServiceCount: number;
  cancellationRate: number | null;
  validDelayObservationCount: number;
  totalDepartureDelayMinutes: number;
  averageDepartureDelayMinutes: number | null;
};

export type PivotTableRow = {
  rowKey: string;
  rowLabel: string;
  cells: Record<string, AggregatedMeasureValues>;
  rowTotal: AggregatedMeasureValues;
};

export type PivotTableResult = {
  rowDimension: OlapDimension;
  columnDimension: OlapDimension;
  columnKeys: string[];
  rows: PivotTableRow[];
  columnTotals: Record<string, AggregatedMeasureValues>;
  grandTotal: AggregatedMeasureValues;
};