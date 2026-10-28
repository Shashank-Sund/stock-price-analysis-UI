import { describe, expect, it } from 'vitest';
import { hasErrors, validateForm } from './validation';
import { TICKER_RE } from './tickers';

const today = new Date(2026, 9, 27); // 2026-10-27
const ok = { startDate: '2025-01-01', endDate: '2025-12-31', tickers: ['AAPL'] };

describe('validateForm', () => {
  it('accepts a valid form', () => {
    expect(hasErrors(validateForm(ok, today))).toBe(false);
  });

  it('requires both dates', () => {
    const e = validateForm({ ...ok, startDate: '', endDate: '' }, today);
    expect(e.startDate).toMatch(/start date/i);
    expect(e.endDate).toMatch(/end date/i);
  });

  it('requires start before end', () => {
    expect(validateForm({ ...ok, startDate: '2025-12-31', endDate: '2025-01-01' }, today).startDate).toMatch(/before/);
    expect(validateForm({ ...ok, startDate: '2025-06-01', endDate: '2025-06-01' }, today).startDate).toMatch(/before/);
  });

  it('rejects an end date in the future but allows today', () => {
    expect(validateForm({ ...ok, endDate: '2026-10-28' }, today).endDate).toMatch(/future/);
    expect(validateForm({ ...ok, endDate: '2026-10-27' }, today).endDate).toBeUndefined();
  });

  it('rejects impossible dates', () => {
    expect(validateForm({ ...ok, startDate: '2025-02-30' }, today).startDate).toMatch(/valid/);
  });

  it('requires at least one ticker', () => {
    expect(validateForm({ ...ok, tickers: [] }, today).tickers).toMatch(/at least one/);
  });

  it('lists invalid tickers', () => {
    expect(validateForm({ ...ok, tickers: ['AAPL', 'BAD$', 'WAYTOOLONGTICKER'] }, today).tickers).toBe(
      'Invalid tickers: BAD$, WAYTOOLONGTICKER. Use up to 10 letters, digits or . - ^ =',
    );
  });

  it.each(['AAPL', 'BRK.B', 'BTC-USD', '^GSPC', 'EURUSD=X', 'msft', '7203'])('ticker %s matches', (t) => {
    expect(TICKER_RE.test(t)).toBe(true);
  });

  it.each(['', 'AA PL', 'A/B', 'ABCDEFGHIJK', 'A,B'])('ticker "%s" does not match', (t) => {
    expect(TICKER_RE.test(t)).toBe(false);
  });
});

describe('backend limits', () => {
  const tenOthers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  it('allows 10 tickers plus SPY', () => {
    expect(validateForm({ ...ok, tickers: [...tenOthers, 'SPY'] }, today).tickers).toBeUndefined();
  });

  it('rejects more than 10 tickers', () => {
    expect(validateForm({ ...ok, tickers: [...tenOthers, 'K'] }, today).tickers).toMatch(/at most 10 tickers/);
  });

  it('allows exactly 20 years and rejects more', () => {
    expect(validateForm({ ...ok, startDate: '2005-10-27', endDate: '2025-10-27' }, today).startDate).toBeUndefined();
    expect(validateForm({ ...ok, startDate: '2005-10-26', endDate: '2025-10-27' }, today).startDate).toBe(
      'The date range can be at most 20 years.',
    );
  });
});
