import { describe, expect, it } from 'vitest';
import { MAX, MULTI, SHORT, SINGLE, SINGLE_5Y, WEEKLY, WITH_SPY } from './json-fixtures';
import type { AnalysisResponse } from '@/lib/types';

// Checks that the real backend fixtures match the types and assumptions the UI relies on.
describe.each([
  ['single 1Y', SINGLE],
  ['single 5Y', SINGLE_5Y],
  ['weekly 10Y', WEEKLY],
  ['short 1M', SHORT],
  ['multi 3', MULTI],
  ['with SPY', WITH_SPY],
  ['10 tickers 20Y', MAX],
])('fixture %s follows the contract', (_name, r: AnalysisResponse) => {
  it('has the envelope fields', () => {
    expect(r.version).toBe(1);
    expect(r.benchmark_symbol).toBe('SPY');
    expect(r.risk_free_rate).toBe(0);
    expect(['1d', '1wk']).toContain(r.interval);
  });

  it('aligns series arrays', () => {
    for (const s of Object.values(r.series)) {
      const n = s.prices.date.length;
      for (const k of ['open', 'high', 'low', 'close', 'volume', 'sma50', 'sma200'] as const) {
        expect(s.prices[k]).toHaveLength(n);
      }
      expect(s.risk.rolling_volatility).toHaveLength(n);
      expect(s.risk.drawdown).toHaveLength(n);
      expect(s.returns.histogram.edges).toHaveLength(s.returns.histogram.counts.length + 1);
      expect(s.returns).not.toHaveProperty('date');
    }
    const c = r.compare.cumulative_return;
    for (const v of Object.values(c.values)) expect(v).toHaveLength(c.date.length);
  });

  it('includes SPY once', () => {
    expect(Object.keys(r.series).filter((k) => k === 'SPY')).toHaveLength(1);
    expect(r.compare.correlation.symbols).toContain('SPY');
  });
});

it('uses weekly bars for ranges longer than 5 years', () => {
  expect(WEEKLY.interval).toBe('1wk');
  expect(SINGLE.interval).toBe('1d');
  expect(MAX.interval).toBe('1wk');
  expect(SINGLE_5Y.interval).toBe('1d');
  const s = WEEKLY.series.NVDA;
  expect(s.prices.date.length).toBeLessThan(s.summary.trading_days / 4);
});

it('lists SPY once as a user ticker when it was entered', () => {
  expect(WITH_SPY.tickers).toEqual(['TSLA', 'SPY']);
  expect(WITH_SPY.series.SPY.is_benchmark).toBe(false);
  expect(SINGLE.series.SPY.is_benchmark).toBe(true);
});
