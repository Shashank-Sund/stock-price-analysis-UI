import { describe, expect, it } from 'vitest';
import {
  buildHeatmap,
  buildPriceRows,
  compareRows,
  correlationExtremes,
  correlationGrid,
  divergingColor,
  extremes,
  histogramBins,
  logGrowthTicks,
  niceTicks,
  placeLabels,
  timeRows,
  timeTicks,
} from './transforms';
import { MAX, MULTI, SINGLE } from '@/test/json-fixtures';

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

describe('buildHeatmap', () => {
  const monthly = [
    { year: 2025, month: 10, return: 0.005, partial: true },
    { year: 2025, month: 11, return: 0.03, partial: false },
    { year: 2025, month: 12, return: -0.02, partial: false },
    { year: 2026, month: 1, return: 0.1, partial: false },
    { year: 2026, month: 2, return: null, partial: true },
  ];

  it('places months in a years by months grid', () => {
    const g = buildHeatmap(monthly);
    expect(g.rows.map((r) => r.year)).toEqual([2025, 2026]);
    expect(g.rows[0].cells.slice(0, 9)).toEqual(new Array(9).fill(null));
    expect(g.rows[0].cells[9]).toEqual({ year: 2025, month: 10, value: 0.005, partial: true });
    expect(g.rows[1].cells[1]?.value).toBeNull();
  });

  it('compounds the year total and marks partial years', () => {
    const g = buildHeatmap(monthly);
    expect(g.rows[0].total).toBeCloseTo(1.005 * 1.03 * 0.98 - 1, 9);
    expect(g.rows[0].totalPartial).toBe(true);
    // A missing month value makes the year total unknown.
    expect(g.rows[1].total).toBeNull();
  });

  it('builds the grid for 20 years of real data', () => {
    const g = buildHeatmap(MAX.series.AAPL.seasonality.monthly);
    expect(g.rows).toHaveLength(21);
    expect(g.rows.every((r) => r.cells.length === 12)).toBe(true);
    expect(g.rows[5].totalPartial).toBe(false);
    expect(g.scale).toBeGreaterThanOrEqual(0.02);
  });
});

describe('divergingColor', () => {
  it('mixes toward blue above zero and red below, neutral at zero', () => {
    expect(divergingColor(0.05, 0.1)).toEqual({ background: 'color-mix(in oklch, var(--div-pos) 50%, var(--div-mid))', strong: false });
    expect(divergingColor(-0.2, 0.1)).toEqual({ background: 'color-mix(in oklch, var(--div-neg) 100%, var(--div-mid))', strong: true });
    expect(divergingColor(0, 0.1).background).toContain('0%');
    expect(divergingColor(null, 0.1).background).toBe('var(--muted)');
  });
});

describe('compare transforms', () => {
  it('builds cumulative rows and keeps nulls where a ticker has no bar', () => {
    const rows = compareRows(MAX.compare, ['META', 'SPY']);
    expect(rows).toHaveLength(MAX.compare.cumulative_return.date.length);
    expect(rows[0].META).toBeNull();
    expect(rows[0].SPY).not.toBeNull();
    const growth = compareRows(MAX.compare, ['SPY'], true);
    expect(growth.at(-1)!.SPY).toBeCloseTo(1 + (MAX.compare.cumulative_return.values.SPY.at(-1) as number), 9);
  });

  it('orders the correlation grid by the given symbols and finds the extremes', () => {
    const g = correlationGrid(MULTI.compare, ['NVDA', 'AAPL', 'SPY', 'NOPE']);
    expect(g.symbols).toEqual(['NVDA', 'AAPL', 'SPY']);
    expect(g.rows[0][0].value).toBe(1);
    expect(g.rows[0][1]).toEqual({ row: 'NVDA', col: 'AAPL', value: g.rows[1][0].value });
    const { hi, lo } = correlationExtremes(g);
    expect(hi!.value!).toBeGreaterThanOrEqual(lo!.value!);
    expect(hi!.row).not.toBe(hi!.col);
  });

  it('makes round ticks', () => {
    expect(niceTicks(0, 0.38, 4)).toEqual([0, 0.1, 0.2, 0.3, 0.4]);
    expect(niceTicks(-0.012, 0.3)).toEqual([-0.1, 0, 0.1, 0.2, 0.3]);
    expect(logGrowthTicks(0.6, 450)).toEqual([0.5, 1, 2, 4, 11, 31, 101, 301, 1001]);
    expect(logGrowthTicks(1.2, 3)).toEqual([1, 2, 4]);
  });

  it('moves a scatter label away from a nearby dot', () => {
    const sides = placeLabels(
      [
        { x: 0.2, y: 0.1, width: 30 },
        { x: 0.21, y: 0.1, width: 30 },
      ],
      { width: 500, height: 250 },
      { x: [0, 0.6], y: [0, 0.4] },
    );
    expect(sides[0]).not.toBe('right');
  });
});
