/**
 * CSV export of the price data, the period returns and the risk series. One row per bar
 * (daily, or weekly for ranges over 5 years); several tickers are stacked with a symbol
 * column. Numbers are written raw (fractions for returns), empty when missing.
 */
import type { AnalysisResponse, Interval, Num, TickerData } from './types';

export function csvField(v: string | number | null | undefined): string {
  if (v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v))) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const row = (fields: (string | number | null | undefined)[]) => fields.map(csvField).join(',');

export function csvHeader(interval: Interval): string[] {
  const period = interval === '1wk' ? 'weekly' : 'daily';
  return [
    'symbol',
    'date',
    'open',
    'high',
    'low',
    'close',
    'volume',
    'sma50',
    'sma200',
    `${period}_return`,
    'drawdown',
    'rolling_volatility_30d',
  ];
}

/** close_t / close_(t-1) - 1 per bar (null for the first bar or a missing close). */
export function periodReturns(close: Num[]): Num[] {
  return close.map((c, i) => {
    const prev = i > 0 ? close[i - 1] : null;
    return c !== null && prev !== null && prev !== 0 ? Number((c / prev - 1).toFixed(6)) : null;
  });
}

function tickerRows(t: TickerData): string[] {
  const p = t.prices;
  const ret = periodReturns(p.close);
  return p.date.map((d, i) =>
    row([
      t.symbol,
      d,
      p.open[i],
      p.high[i],
      p.low[i],
      p.close[i],
      p.volume[i],
      p.sma50[i],
      p.sma200[i],
      ret[i],
      t.risk.drawdown[i],
      t.risk.rolling_volatility[i],
    ]),
  );
}

/** CSV text for the given symbols (in order), CRLF line endings as RFC 4180 suggests. */
export function buildCsv(data: AnalysisResponse, symbols: string[]): string {
  const lines = [row(csvHeader(data.interval))];
  for (const s of symbols) {
    const t = data.series[s];
    if (t) lines.push(...tickerRows(t));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function csvFilename(symbols: string[], data: AnalysisResponse): string {
  const names = symbols.map((s) => s.replace(/[^A-Za-z0-9.^=-]/g, '')).filter(Boolean);
  const label = names.length > 3 ? `${names.slice(0, 3).join('-')}-and-${names.length - 3}-more` : names.join('-');
  return `${label || 'prices'}_${data.start_date}_to_${data.end_date}${data.interval === '1wk' ? '_weekly' : ''}.csv`;
}
