/** Null-safe display formatters. Missing values render as an em dash. */

export const EMPTY_VALUE = "—";

const integerFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatNumber(value: number | null | undefined): string {
  return isFiniteNumber(value) ? integerFormatter.format(value) : EMPTY_VALUE;
}

export function formatMinutes(value: number | null | undefined, fractionDigits = 1): string {
  return isFiniteNumber(value) ? `${value.toFixed(fractionDigits)} min` : EMPTY_VALUE;
}

/** `value` is a ratio in 0..1. */
export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  return isFiniteNumber(value) ? `${(value * 100).toFixed(fractionDigits)}%` : EMPTY_VALUE;
}

function sign(value: number): string {
  return value > 0 ? "+" : value < 0 ? "−" : "±";
}

export function formatMinutesDelta(value: number | null | undefined): string {
  return isFiniteNumber(value) ? `${sign(value)}${Math.abs(value).toFixed(1)} min` : EMPTY_VALUE;
}

export function formatNumberDelta(value: number | null | undefined): string {
  return isFiniteNumber(value) ? `${sign(value)}${integerFormatter.format(Math.abs(value))}` : EMPTY_VALUE;
}

/** Ratio delta rendered as percentage points. */
export function formatPercentPointDelta(value: number | null | undefined): string {
  return isFiniteNumber(value) ? `${sign(value)}${Math.abs(value * 100).toFixed(1)} pp` : EMPTY_VALUE;
}

export function formatDemoTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date) + " UTC";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats period keys ("YYYY", "YYYY-MM", "YYYY-MM-DD") for axes and tooltips. */
export function formatPeriod(period: string, style: "short" | "long" = "short"): string {
  const [year, month, day] = period.split("-");
  if (!month) return year;
  const monthName = MONTHS[Number(month) - 1] ?? month;
  if (!day) return style === "long" ? `${monthName} ${year}` : `${monthName} '${year.slice(2)}`;
  return style === "long" ? `${Number(day)} ${monthName} ${year}` : `${Number(day)} ${monthName}`;
}
