/** Plain text descriptions of the charts, for screen readers and captions. */
import { formatDate, formatPercent, formatPrice, formatRatio, formatSignedPercent, MONTHS_LONG, sign } from './format';
import { correlationExtremes, extremes, type CorrelationCell } from './transforms';
import type { AnalysisResponse, RiskReturnPoint, TickerData } from './types';

export function priceSummary(t: TickerData): string {
  const s = t.summary;
  const dir = sign(s.total_return) > 0 ? 'up' : sign(s.total_return) < 0 ? 'down' : 'unchanged';
  const parts = [
    `${t.symbol} closed at ${formatPrice(s.end_price)} on ${formatDate(s.end_date)}, ${dir} ${formatSignedPercent(s.total_return).replace(/^[+-]/, '')} from ${formatPrice(s.start_price)} on ${formatDate(s.start_date)}.`,
  ];
  if (s.high && s.low) {
    parts.push(
      `Highest close ${formatPrice(s.high.price)} on ${formatDate(s.high.date)}, lowest ${formatPrice(s.low.price)} on ${formatDate(s.low.date)}.`,
    );
  }
  return parts.join(' ');
}

export function returnsSummary(t: TickerData): string {
  const r = t.returns;
  const s = t.summary;
  if (r.mean === null) return 'Not enough trading days to describe the distribution of daily returns.';
  return `Daily returns ranged from ${formatSignedPercent(s.worst_day?.return)} to ${formatSignedPercent(s.best_day?.return)}. The average day returned ${formatSignedPercent(r.mean)} with a standard deviation of ${formatPercent(r.std)}. On 95% of days the return was better than ${formatSignedPercent(r.var_95)}.`;
}

export function volatilitySummary(t: TickerData): string {
  const e = extremes(t.prices.date, t.risk.rolling_volatility);
  if (!e.max || !e.min || !e.last) return 'Not enough history for a 30 day volatility.';
  return `30 day volatility ranged from ${formatPercent(e.min.value, 1)} on ${formatDate(e.min.date)} to ${formatPercent(e.max.value, 1)} on ${formatDate(e.max.date)}, and was ${formatPercent(e.last.value, 1)} at the end of the range. Over the whole range it was ${formatPercent(t.summary.annual_volatility, 1)}.`;
}

export function drawdownSummary(t: TickerData): string {
  const s = t.summary;
  const last = extremes(t.prices.date, t.risk.drawdown).last;
  if (!s.max_drawdown_peak || !s.max_drawdown_trough) return `${t.symbol} never closed below an earlier high in this range.`;
  const rec = s.max_drawdown_recovery ? `It got back to the peak on ${formatDate(s.max_drawdown_recovery)}.` : 'It has not recovered to that peak yet.';
  const now = last ? ` At the end of the range it was ${formatSignedPercent(last.value)} from its high.` : '';
  return `The deepest drawdown was ${formatSignedPercent(s.max_drawdown)}, from the peak on ${formatDate(s.max_drawdown_peak)} to the low on ${formatDate(s.max_drawdown_trough)}. ${rec}${now}`;
}

export function heatmapSummary(t: TickerData): string {
  const months = t.seasonality.monthly.filter((m) => m.return !== null);
  if (!months.length) return 'No monthly returns in this range.';
  const best = months.reduce((a, b) => (b.return! > a.return! ? b : a));
  const worst = months.reduce((a, b) => (b.return! < a.return! ? b : a));
  const up = months.filter((m) => m.return! > 0).length;
  const name = (m: { year: number; month: number }) => `${MONTHS_LONG[m.month - 1]} ${m.year}`;
  return `${up} of ${months.length} months were positive. The best month was ${name(best)} (${formatSignedPercent(best.return, 1)}), the worst ${name(worst)} (${formatSignedPercent(worst.return, 1)}).`;
}

export function byMonthSummary(t: TickerData): string {
  const rows = t.seasonality.by_month.filter((m) => m.average !== null);
  if (!rows.length) return 'Averages by month need at least one full calendar month in the range.';
  const best = rows.reduce((a, b) => (b.average! > a.average! ? b : a));
  const worst = rows.reduce((a, b) => (b.average! < a.average! ? b : a));
  const yrs = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`;
  if (rows.length === 1) {
    return `Only ${MONTHS_LONG[best.month - 1]} is a full month in this range: ${formatSignedPercent(best.average, 1)}.`;
  }
  return `On average ${MONTHS_LONG[best.month - 1]} was the strongest month (${formatSignedPercent(best.average, 1)} over ${yrs(best.years)}) and ${MONTHS_LONG[worst.month - 1]} the weakest (${formatSignedPercent(worst.average, 1)} over ${yrs(worst.years)}).`;
}

export function cumulativeSummary(data: AnalysisResponse, symbols: string[], benchmark: string | null): string {
  const totals = symbols
    .map((s) => ({ s, v: data.series[s]?.summary.total_return ?? null }))
    .filter((x): x is { s: string; v: number } => x.v !== null && x.s !== benchmark);
  const parts: string[] = [];
  if (totals.length > 1) {
    const best = totals.reduce((a, b) => (b.v > a.v ? b : a));
    const worst = totals.reduce((a, b) => (b.v < a.v ? b : a));
    parts.push(`${best.s} gained the most (${formatSignedPercent(best.v, 1)}) and ${worst.s} the least (${formatSignedPercent(worst.v, 1)}).`);
  } else if (totals.length === 1) {
    parts.push(`${totals[0].s} returned ${formatSignedPercent(totals[0].v, 1)}.`);
  }
  if (benchmark && data.series[benchmark]) {
    parts.push(`SPY, the benchmark, returned ${formatSignedPercent(data.series[benchmark].summary.total_return, 1)}.`);
  }
  return parts.join(' ') || 'No returns to compare.';
}

export function correlationSummary(grid: { symbols: string[]; rows: CorrelationCell[][] }): string {
  const { hi, lo } = correlationExtremes(grid);
  if (!hi || !lo) return 'Not enough overlapping trading days to measure correlation.';
  if (hi === lo) return `The correlation of ${hi.row} and ${hi.col} daily returns was ${formatRatio(hi.value)}.`;
  return `The most closely linked pair was ${hi.row} and ${hi.col} (${formatRatio(hi.value)}); the least, ${lo.row} and ${lo.col} (${formatRatio(lo.value)}).`;
}

export function riskReturnSummary(points: RiskReturnPoint[]): string {
  const ok = points.filter((p) => p.annual_return !== null && p.annual_volatility !== null);
  if (!ok.length) return 'No risk and return figures to plot.';
  const by = (k: 'annual_return' | 'annual_volatility' | 'sharpe') =>
    ok.filter((p) => p[k] !== null).reduce((a, b) => ((b[k] as number) > (a[k] as number) ? b : a), ok[0]);
  const r = by('annual_return');
  const v = by('annual_volatility');
  const s = by('sharpe');
  return `Highest annual return: ${r.symbol} (${formatSignedPercent(r.annual_return, 1)}). Most volatile: ${v.symbol} (${formatPercent(v.annual_volatility, 1)}). Best Sharpe ratio: ${s.symbol} (${formatRatio(s.sharpe)}).`;
}
