/**
 * Number and date formatting for the dashboard. Missing values (null) render as
 * "n/a". Negative numbers use the ASCII hyphen-minus; no dash characters are used
 * as separators anywhere.
 */
import type { Num } from './types';

export const NA = 'n/a';

const isNum = (v: Num | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

const cache = new Map<string, Intl.NumberFormat>();
function nf(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-US', options);
    cache.set(key, f);
  }
  return f;
}

/** A fraction as a percentage: 0.1234 is "12.34%". */
export function formatPercent(v: Num | undefined, digits = 2): string {
  if (!isNum(v)) return NA;
  return nf({ style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

/** A fraction as a signed percentage: "+12.34%", "-3.10%", "0.00%". */
export function formatSignedPercent(v: Num | undefined, digits = 2): string {
  if (!isNum(v)) return NA;
  const s = formatPercent(Math.abs(v), digits);
  const rounded = Number((Math.abs(v) * 100).toFixed(digits));
  if (rounded === 0) return s;
  return `${v > 0 ? '+' : '-'}${s}`;
}

/** Prices with currency style decimals and grouping: "1,234.56". */
export function formatPrice(v: Num | undefined): string {
  if (!isNum(v)) return NA;
  const digits = Math.abs(v) < 1 && v !== 0 ? 4 : 2;
  return nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

/** A plain ratio such as Sharpe or beta: "1.23", "-0.40". */
export function formatRatio(v: Num | undefined, digits = 2): string {
  if (!isNum(v)) return NA;
  return nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

/** Signed ratio: "+0.41". */
export function formatSignedRatio(v: Num | undefined, digits = 2): string {
  if (!isNum(v)) return NA;
  const s = formatRatio(Math.abs(v), digits);
  return Number(s) === 0 ? s : `${v > 0 ? '+' : '-'}${s}`;
}

/** Compact counts: 55.7M, 1.2B, 940K. */
export function formatCompact(v: Num | undefined): string {
  if (!isNum(v)) return NA;
  return nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

export function formatInteger(v: Num | undefined): string {
  if (!isNum(v)) return NA;
  return nf({ maximumFractionDigits: 0 }).format(v);
}

// Dates are calendar dates from the API (YYYY-MM-DD). Format them in UTC so the
// viewer's time zone never shifts the day.

/** "YYYY-MM-DD" to UTC milliseconds, or NaN. */
export function dateToMs(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const monthYearFmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const monthLongFmt = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });

/** "Jan 2, 2025". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return NA;
  const ms = dateToMs(iso);
  return Number.isNaN(ms) ? iso : dateFmt.format(ms);
}

/** "Jan 2" (no year). */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return NA;
  const ms = dateToMs(iso);
  return Number.isNaN(ms) ? iso : dayFmt.format(ms);
}

/** "Jan 2 to Apr 8, 2025", or with both years when they differ. */
export function formatDateRange(a: string | null | undefined, b: string | null | undefined): string {
  if (!a || !b) return NA;
  const sameYear = a.slice(0, 4) === b.slice(0, 4);
  return `${sameYear ? formatDay(a) : formatDate(a)} to ${formatDate(b)}`;
}

/** Axis tick for a UTC timestamp: "Jan 2025" for long spans, "Jan 2" for short ones. */
export function formatAxisDate(ms: number, spanDays: number): string {
  return spanDays > 200 ? monthYearFmt.format(ms) : dayFmt.format(ms);
}

export const MONTHS_SHORT = Array.from({ length: 12 }, (_, i) => monthFmt.format(Date.UTC(2000, i, 1)));
export const MONTHS_LONG = Array.from({ length: 12 }, (_, i) => monthLongFmt.format(Date.UTC(2000, i, 1)));

/** Sign of a value for styling: 1, -1 or 0 (null counts as 0). */
export function sign(v: Num | undefined): 1 | -1 | 0 {
  if (!isNum(v) || v === 0) return 0;
  return v > 0 ? 1 : -1;
}

/** Axis tick percentage: "15%" for whole percents, "7.5%" otherwise. */
export function formatTickPercent(v: number): string {
  // 1,000% and up: compact, "40K%".
  if (Math.abs(v) >= 10) return `${nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v * 100)}%`;
  const whole = Math.abs(Math.round(v * 1000) / 10 - Math.round(v * 100)) < 1e-9;
  return formatPercent(v, whole ? 0 : 1);
}
