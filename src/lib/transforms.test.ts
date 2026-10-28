import { describe, expect, it } from 'vitest';
import { buildPriceRows } from './transforms';
import { SINGLE } from '@/test/json-fixtures';

describe('buildPriceRows', () => {
  it('turns columns into rows with UTC second timestamps', () => {
    const rows = buildPriceRows(SINGLE.series.AAPL.prices);
    expect(rows).toHaveLength(SINGLE.series.AAPL.prices.date.length);
    expect(rows[0]).toMatchObject({ date: '2025-10-28', time: Date.UTC(2025, 9, 28) / 1000 });
    expect(rows.at(-1)?.close).toBe(347.1);
  });

  it('drops malformed and out of order dates', () => {
    const p = { date: ['2025-01-03', 'bad', '2025-01-02', '2025-01-06'], open: [1, 2, 3, 4], high: [1, 2, 3, 4], low: [1, 2, 3, 4], close: [1, 2, 3, null], volume: [1, 2, 3, 4], sma50: [], sma200: [] };
    const rows = buildPriceRows(p);
    expect(rows.map((r) => r.date)).toEqual(['2025-01-03', '2025-01-06']);
    expect(rows[1].close).toBeNull();
    expect(rows[0].sma50).toBeNull();
  });
});
