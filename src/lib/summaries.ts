/** Plain text descriptions of the charts, for screen readers and captions. */
import { formatDate, formatPercent, formatPrice, formatSignedPercent, sign } from './format';
import { extremes } from './transforms';
import type { TickerData } from './types';

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
