/** Pure data transforms from the API shapes to chart friendly rows. */
import { dateToMs } from './format';
import type { Num, Prices } from './types';

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
