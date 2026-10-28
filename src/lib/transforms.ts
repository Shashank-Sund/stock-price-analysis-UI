/** Pure data transforms from the API shapes to chart friendly rows. */
import { dateToMs } from './format';
import type { Compare, Histogram, Num, Prices } from './types';

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

// ---------------------------------------------------------------------------
// Compare

/** Cumulative return rows for the given symbols; `growth` turns returns into growth of 1 (for a log axis). */
export function compareRows(c: Compare, symbols: string[], growth = false): TimePoint[] {
  const cols: Record<string, Num[]> = {};
  for (const s of symbols) {
    const v = c.cumulative_return.values[s];
    if (v) cols[s] = growth ? v.map((x) => (x === null ? null : 1 + x)) : v;
  }
  return timeRows(c.cumulative_return.date, cols);
}

export interface CorrelationCell {
  row: string;
  col: string;
  value: Num;
}

/** Correlation matrix as rows of cells, limited to (and ordered by) the given symbols. */
export function correlationGrid(c: Compare, symbols: string[]): { symbols: string[]; rows: CorrelationCell[][] } {
  const idx = new Map(c.correlation.symbols.map((s, i) => [s, i]));
  const keep = symbols.filter((s) => idx.has(s));
  return {
    symbols: keep,
    rows: keep.map((r) => keep.map((col) => ({ row: r, col, value: c.correlation.matrix[idx.get(r)!]?.[idx.get(col)!] ?? null }))),
  };
}

/** The most and least correlated distinct pairs. */
export function correlationExtremes(grid: { symbols: string[]; rows: CorrelationCell[][] }) {
  let hi: CorrelationCell | null = null;
  let lo: CorrelationCell | null = null;
  grid.rows.forEach((row, i) =>
    row.forEach((cell, j) => {
      if (j >= i || cell.value === null) return;
      if (!hi || cell.value > hi.value!) hi = cell;
      if (!lo || cell.value < lo.value!) lo = cell;
    }),
  );
  return { hi: hi as CorrelationCell | null, lo: lo as CorrelationCell | null };
}

/** Round tick values (steps of 1, 2, 2.5 or 5 times a power of ten) covering [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max === min) {
    max = min + 1;
  }
  const raw = (max - min) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const start = Math.floor(min / step + 1e-9) * step;
  const end = Math.ceil(max / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) out.push(Number((Math.round(v / step) * step).toFixed(10)));
  return out;
}

export type LabelSide = 'right' | 'left' | 'top' | 'bottom';

/**
 * Picks a side for each scatter label so labels do not overlap each other or other dots.
 * Works in pixels of the plot area; `width` is the label text width estimate.
 */
export function placeLabels(
  points: { x: number; y: number; width: number }[],
  plot: { width: number; height: number },
  domain: { x: [number, number]; y: [number, number] },
): LabelSide[] {
  const px = (p: { x: number; y: number }) => ({
    x: ((p.x - domain.x[0]) / (domain.x[1] - domain.x[0] || 1)) * plot.width,
    y: plot.height - ((p.y - domain.y[0]) / (domain.y[1] - domain.y[0] || 1)) * plot.height,
  });
  const dots = points.map(px);
  const h = 14;
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const hit = (a: { x0: number; x1: number; y0: number; y1: number }, b: typeof a) =>
    a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  return points.map((p, i) => {
    const d = dots[i];
    const boxes: Record<LabelSide, { x0: number; x1: number; y0: number; y1: number }> = {
      right: { x0: d.x + 8, x1: d.x + 8 + p.width, y0: d.y - h / 2, y1: d.y + h / 2 },
      left: { x0: d.x - 8 - p.width, x1: d.x - 8, y0: d.y - h / 2, y1: d.y + h / 2 },
      top: { x0: d.x - p.width / 2, x1: d.x + p.width / 2, y0: d.y - 8 - h, y1: d.y - 8 },
      bottom: { x0: d.x - p.width / 2, x1: d.x + p.width / 2, y0: d.y + 8, y1: d.y + 8 + h },
    };
    const sides: LabelSide[] = ['right', 'left', 'top', 'bottom'];
    const inside = (b: (typeof boxes)['right']) => b.x0 >= -4 && b.x1 <= plot.width + 20 && b.y0 >= -16 && b.y1 <= plot.height;
    const clear = (b: (typeof boxes)['right']) =>
      !placed.some((q) => hit(b, q)) && !dots.some((o, j) => j !== i && hit(b, { x0: o.x - 5, x1: o.x + 5, y0: o.y - 5, y1: o.y + 5 }));
    const side = sides.find((s) => inside(boxes[s]) && clear(boxes[s])) ?? sides.find((s) => inside(boxes[s])) ?? 'right';
    placed.push(boxes[side]);
    return side;
  });
}

const LOG_RETURN_TICKS = [-0.9, -0.75, -0.5, 0, 1, 3, 10, 30, 100, 300, 1000, 3000, 10000];

/** Ticks for a log axis of growth (1 + return), at round returns such as 0%, 100%, 300%, 1K%. */
export function logGrowthTicks(minGrowth: number, maxGrowth: number): number[] {
  // From the largest tick at or below the data to the smallest at or above it, so nothing is clipped.
  const all = LOG_RETURN_TICKS.map((r) => 1 + r);
  let lo = 0;
  while (lo + 1 < all.length && all[lo + 1] <= minGrowth) lo++;
  let hi = all.length - 1;
  while (hi - 1 >= 0 && all[hi - 1] >= maxGrowth) hi--;
  const t = all.slice(lo, hi + 1);
  return t.length >= 2 ? t : [minGrowth, maxGrowth];
}
