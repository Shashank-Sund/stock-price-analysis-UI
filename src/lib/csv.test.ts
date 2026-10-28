import { describe, expect, it } from 'vitest';
import { buildCsv, csvField, csvFilename, csvHeader, periodReturns } from './csv';
import { MAX, MULTI, SINGLE, WEEKLY } from '@/test/json-fixtures';

describe('csv', () => {
  it('escapes fields per RFC 4180', () => {
    expect(csvField('BRK-B')).toBe('BRK-B');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField(null)).toBe('');
    expect(csvField(Number.NaN)).toBe('');
    expect(csvField(0)).toBe('0');
  });

  it('computes period returns from closes', () => {
    expect(periodReturns([100, 110, null, 99])).toEqual([null, 0.1, null, null]);
  });

  it('writes one row per bar with the header', () => {
    const text = buildCsv(SINGLE, ['AAPL']);
    const lines = text.trimEnd().split('\r\n');
    expect(lines[0]).toBe('symbol,date,open,high,low,close,volume,sma50,sma200,daily_return,drawdown,rolling_volatility_30d');
    expect(lines).toHaveLength(SINGLE.series.AAPL.prices.date.length + 1);
    const first = lines[1].split(',');
    expect(first[0]).toBe('AAPL');
    expect(first[1]).toBe('2025-10-28');
    expect(first[9]).toBe(''); // no return on the first bar
    expect(lines.at(-1)!.split(',')[5]).toBe('347.1');
  });

  it('stacks several tickers and labels weekly returns', () => {
    const text = buildCsv(MULTI, ['AAPL', 'MSFT', 'NVDA', 'SPY']);
    const symbols = new Set(text.trimEnd().split('\r\n').slice(1).map((l) => l.split(',')[0]));
    expect([...symbols]).toEqual(['AAPL', 'MSFT', 'NVDA', 'SPY']);
    expect(csvHeader(WEEKLY.interval)).toContain('weekly_return');
  });

  it('names files after the tickers and range', () => {
    expect(csvFilename(['AAPL'], SINGLE)).toBe('AAPL_2025-10-28_to_2026-10-28.csv');
    expect(csvFilename(MAX.tickers, MAX)).toBe('AAPL-MSFT-NVDA-and-7-more_2006-10-28_to_2026-10-28_weekly.csv');
  });
});
