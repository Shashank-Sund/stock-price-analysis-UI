import { describe, expect, it } from 'vitest';
import { buildView } from './dashboard';
import { MAX, MULTI, SINGLE, WITH_SPY } from '@/test/json-fixtures';

const q = (tickers: string[]) => ({ startDate: '2025-10-28', endDate: '2026-10-28', tickers });

describe('buildView', () => {
  it('separates the benchmark from the user tickers', () => {
    const v = buildView(MULTI, q(['AAPL', 'MSFT', 'NVDA']));
    expect(v.tickers).toEqual(['AAPL', 'MSFT', 'NVDA']);
    expect(v.benchmark?.symbol).toBe('SPY');
    expect(v.symbols).toEqual(['AAPL', 'MSFT', 'NVDA', 'SPY']);
    expect(v.styles.SPY).toMatchObject({ benchmark: true, dashed: true });
    expect(v.styles.AAPL.color).toBe('var(--series-1)');
  });

  it('shows SPY once when the user entered it', () => {
    const v = buildView(WITH_SPY, q(['TSLA', 'SPY']));
    expect(v.tickers).toEqual(['TSLA', 'SPY']);
    expect(v.benchmark).toBeNull();
    expect(v.userHasBenchmark).toBe(true);
    expect(v.symbols).toEqual(['TSLA', 'SPY']);
  });

  it('puts SPY back when it was left out of the request to stay within the backend limit', () => {
    const typed = [...MAX.tickers.slice(0, 3), 'SPY', ...MAX.tickers.slice(3)];
    const v = buildView(MAX, q(typed));
    expect(v.tickers).toEqual(typed);
    expect(v.benchmark).toBeNull();
  });

  it('gives tickers 9 and 10 dashed lines in slots 1 and 2', () => {
    const v = buildView(MAX, q(MAX.tickers));
    expect(v.styles[MAX.tickers[8]]).toMatchObject({ color: 'var(--series-1)', dashed: true });
    expect(v.styles[MAX.tickers[9]]).toMatchObject({ color: 'var(--series-2)', dashed: true });
    expect(v.styles[MAX.tickers[7]]).toMatchObject({ color: 'var(--series-8)', dashed: false });
  });

  it('copes with a missing benchmark', () => {
    const v = buildView({ ...SINGLE, benchmark: null, series: { AAPL: SINGLE.series.AAPL } }, q(['AAPL']));
    expect(v.benchmark).toBeNull();
    expect(v.benchmarkAvailable).toBe(false);
  });
});
