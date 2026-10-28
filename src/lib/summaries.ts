/** Plain text descriptions of the charts, for screen readers and captions. */
import { formatDate, formatPrice, formatSignedPercent, sign } from './format';
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
