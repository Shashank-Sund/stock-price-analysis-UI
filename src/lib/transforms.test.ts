import { describe, expect, it } from 'vitest';
import { buildPriceRows, extremes, histogramBins, timeRows, timeTicks } from './transforms';
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

describe('histogramBins', () => {
  it('builds bins with a normal curve scaled to the counts', () => {
    const bins = histogramBins({ edges: [-0.02, -0.01, 0, 0.01, 0.02], counts: [1, 4, 4, 1] }, 0, 0.01);
    expect(bins.map((b) => b.mid)).toEqual([-0.015, -0.005, 0.005, 0.015]);
    // Expected count in the central bins: n * width * pdf(0.005).
    expect(bins[1].normal).toBeCloseTo(10 * 0.01 * (Math.exp(-0.125) / (0.01 * Math.sqrt(2 * Math.PI))), 6);
    expect(bins[0].normal).toBeCloseTo(bins[3].normal!, 9);
  });

  it('skips the curve without a std and rejects malformed histograms', () => {
    expect(histogramBins({ edges: [0, 1], counts: [3] }, 0, null)[0].normal).toBeNull();
    expect(histogramBins({ edges: [0, 1, 2], counts: [3] }, 0, 1)).toEqual([]);
  });

  it('matches the fixture totals', () => {
    const r = SINGLE.series.AAPL.returns;
    const bins = histogramBins(r.histogram, r.mean, r.std);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(SINGLE.series.AAPL.summary.trading_days - 1);
  });
});

describe('timeTicks', () => {
  const iso = (ts: number[]) => ts.map((t) => new Date(t).toISOString().slice(0, 10));

  it('uses year starts for long ranges', () => {
    expect(iso(timeTicks(Date.UTC(2016, 9, 28), Date.UTC(2026, 9, 27)))).toEqual([
      '2018-01-01',
      '2020-01-01',
      '2022-01-01',
      '2024-01-01',
      '2026-01-01',
    ]);
  });

  it('uses every other month start for a year', () => {
    expect(iso(timeTicks(Date.UTC(2025, 9, 28), Date.UTC(2026, 9, 27)))).toEqual([
      '2025-11-01',
      '2026-01-01',
      '2026-03-01',
      '2026-05-01',
      '2026-07-01',
      '2026-09-01',
    ]);
  });

  it('uses weeks for a month', () => {
    const t = timeTicks(Date.UTC(2026, 8, 28), Date.UTC(2026, 9, 27));
    expect(t.length).toBeGreaterThanOrEqual(4);
    expect(t[1] - t[0]).toBe(7 * 86400000);
  });
});

describe('timeRows and extremes', () => {
  it('zips columns and finds extremes, skipping nulls', () => {
    const rows = timeRows(['2025-01-02', '2025-01-03', '2025-01-06'], { v: [null, 0.2, 0.1] });
    expect(rows[1]).toEqual({ t: Date.UTC(2025, 0, 3), date: '2025-01-03', v: 0.2 });
    const e = extremes(['a', 'b', 'c'], [null, 0.2, 0.1]);
    expect(e).toEqual({ min: { value: 0.1, date: 'c' }, max: { value: 0.2, date: 'b' }, last: { value: 0.1, date: 'c' } });
  });
});
