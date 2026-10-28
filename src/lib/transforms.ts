/** Pure data transforms from the API shapes to chart friendly rows. */
import { dateToMs } from './format';
import type { Histogram, Num, Prices } from './types';

export interface PriceRow {
  date: string;
  /** UTC seconds (Lightweight Charts time). */
  time: number;
  open: Num;
  high: Num;
  low: Num;
  close: Num;
  volume: Num;
  sma50: Num;
  sma200: Num;
}

/** Columnar prices to rows, sorted by date, skipping malformed dates and duplicates. */
export function buildPriceRows(p: Prices): PriceRow[] {
  const rows: PriceRow[] = [];
  let last = -Infinity;
  p.date.forEach((date, i) => {
    const ms = dateToMs(date);
    if (Number.isNaN(ms) || ms <= last) return;
    last = ms;
    rows.push({
      date,
      time: ms / 1000,
      open: p.open[i] ?? null,
      high: p.high[i] ?? null,
      low: p.low[i] ?? null,
      close: p.close[i] ?? null,
      volume: p.volume[i] ?? null,
      sma50: p.sma50[i] ?? null,
      sma200: p.sma200[i] ?? null,
    });
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Returns

export interface HistogramBin {
  /** Bin center (a daily return as a fraction). */
  mid: number;
  lo: number;
  hi: number;
  count: number;
  /** Expected count under a normal curve with the sample mean and std, when available. */
  normal: number | null;
}

const normalPdf = (x: number, mu: number, sd: number) => Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

/** Histogram bins from edges and counts, with an optional normal curve scaled to the counts. */
export function histogramBins(h: Histogram, mean: Num, std: Num): HistogramBin[] {
  if (h.edges.length !== h.counts.length + 1) return [];
  const total = h.counts.reduce((a, b) => a + b, 0);
  const canFit = mean !== null && std !== null && std > 0 && total > 0;
  return h.counts.map((count, i) => {
    const lo = h.edges[i];
    const hi = h.edges[i + 1];
    const mid = (lo + hi) / 2;
    return { mid, lo, hi, count, normal: canFit ? total * (hi - lo) * normalPdf(mid, mean!, std!) : null };
  });
}

// ---------------------------------------------------------------------------
// Time series

export interface TimePoint {
  /** UTC milliseconds. */
  t: number;
  date: string;
  [key: string]: number | string | null;
}

/** Zips dates with named value columns into rows keyed by UTC milliseconds. */
export function timeRows(dates: string[], columns: Record<string, Num[]>): TimePoint[] {
  const out: TimePoint[] = [];
  dates.forEach((date, i) => {
    const t = dateToMs(date);
    if (Number.isNaN(t)) return;
    const row: TimePoint = { t, date };
    for (const [k, col] of Object.entries(columns)) row[k] = col[i] ?? null;
    out.push(row);
  });
  return out;
}

const MONTH_STEPS = [1, 2, 3, 6, 12, 24, 36, 60];

/** Evenly spaced month (or year) start ticks between two UTC timestamps, about `target` of them. */
export function timeTicks(min: number, max: number, target = 6): number[] {
  if (!(max > min)) return Number.isFinite(min) ? [min] : [];
  const months = (max - min) / (30.44 * 86400000);
  if (months < 2) {
    // Short ranges: weekly ticks.
    const step = Math.max(1, Math.round(months * 4.35 / target)) * 7 * 86400000;
    const out: number[] = [];
    for (let t = min; t <= max; t += step) out.push(t);
    return out;
  }
  const step = MONTH_STEPS.find((s) => months / s <= target) ?? 120;
  const d = new Date(min);
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth() + 1; // first month start after min
  if (step >= 12) {
    y += 1;
    m = 0;
  }
  const out: number[] = [];
  for (;;) {
    const t = Date.UTC(y, m, 1);
    if (t > max) break;
    if (t >= min && (step < 12 ? m % step === 0 : m === 0 && y % (step / 12) === 0)) out.push(t);
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

export interface Extreme {
  value: number;
  date: string;
}

/** Min and max of a column, with their dates; nulls skipped. */
export function extremes(dates: string[], values: Num[]): { min: Extreme | null; max: Extreme | null; last: Extreme | null } {
  let min: Extreme | null = null;
  let max: Extreme | null = null;
  let last: Extreme | null = null;
  values.forEach((v, i) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return;
    const e = { value: v, date: dates[i] };
    if (!min || v < min.value) min = e;
    if (!max || v > max.value) max = e;
    last = e;
  });
  return { min, max, last };
}

// ---------------------------------------------------------------------------
// Seasonality

export interface HeatCell {
  year: number;
  month: number;
  value: Num;
  partial: boolean;
}

export interface HeatmapGrid {
  /** One row per calendar year in range, ascending, each with 12 month slots (null when out of range). */
  rows: { year: number; cells: (HeatCell | null)[]; total: Num; totalPartial: boolean }[];
  /** Symmetric color scale bound: values at or beyond +/- scale get full color. */
  scale: number;
}

/** Years by months grid from the monthly returns, with each year's compounded return. */
export function buildHeatmap(monthly: { year: number; month: number; return: Num; partial: boolean }[]): HeatmapGrid {
  const byYear = new Map<number, (HeatCell | null)[]>();
  for (const m of monthly) {
    if (m.month < 1 || m.month > 12) continue;
    if (!byYear.has(m.year)) byYear.set(m.year, new Array(12).fill(null));
    byYear.get(m.year)![m.month - 1] = { year: m.year, month: m.month, value: m.return, partial: m.partial };
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const rows = years.map((year) => {
    const cells = byYear.get(year)!;
    const present = cells.filter((c): c is HeatCell => c !== null);
    const values = present.map((c) => c.value);
    const total = values.length && values.every((v) => v !== null) ? values.reduce<number>((p, v) => p * (1 + (v as number)), 1) - 1 : null;
    // A year is partial when it does not cover all 12 months or includes a partial month.
    const totalPartial = present.length < 12 || present.some((c) => c.partial);
    return { year, cells, total, totalPartial };
  });
  const abs = monthly.map((m) => Math.abs(m.return ?? 0)).filter((v) => v > 0).sort((a, b) => a - b);
  // 90th percentile so one outlier does not wash out the rest, rounded up to a whole percent.
  const p90 = abs.length ? abs[Math.min(abs.length - 1, Math.floor(abs.length * 0.9))] : 0.05;
  const scale = Math.max(0.02, Math.ceil(p90 * 100) / 100);
  return { rows, scale };
}

/** Diverging color for a return: red below zero, blue above, neutral gray at zero (CSS color-mix). */
export function divergingColor(value: Num, scale: number): { background: string; strong: boolean } {
  if (value === null || !Number.isFinite(value) || scale <= 0) return { background: 'var(--muted)', strong: false };
  const t = Math.min(1, Math.abs(value) / scale);
  const pct = Math.round(t * 100);
  const pole = value >= 0 ? 'var(--div-pos)' : 'var(--div-neg)';
  return { background: `color-mix(in oklch, ${pole} ${pct}%, var(--div-mid))`, strong: t >= 0.7 };
}
