import { describe, expect, it } from 'vitest';
import {
  formatCompact,
  formatDate,
  formatDateRange,
  formatPercent,
  formatPrice,
  formatRatio,
  formatSignedPercent,
  formatSignedRatio,
  MONTHS_SHORT,
  NA,
  sign,
} from './format';

describe('format', () => {
  it('formats percentages with a sign', () => {
    expect(formatSignedPercent(0.295101)).toBe('+29.51%');
    expect(formatSignedPercent(-0.137985)).toBe('-13.80%');
    expect(formatSignedPercent(0)).toBe('0.00%');
    expect(formatSignedPercent(-0.00001)).toBe('0.00%');
    expect(formatSignedPercent(143.304387, 0)).toBe('+14,330%');
    expect(formatPercent(0.240319)).toBe('24.03%');
  });

  it('never uses dash characters other than the hyphen-minus', () => {
    const out = [formatSignedPercent(-0.5), formatSignedRatio(-1.2), formatDateRange('2025-01-02', '2026-04-08')].join(' ');
    expect(out).not.toMatch(/[‒–—―−]/);
  });

  it('formats prices with two decimals and grouping', () => {
    expect(formatPrice(347.1)).toBe('347.10');
    expect(formatPrice(2617.8847)).toBe('2,617.88');
    expect(formatPrice(0.51234)).toBe('0.5123');
  });

  it('formats ratios and counts', () => {
    expect(formatRatio(1.205475)).toBe('1.21');
    expect(formatSignedRatio(0.41)).toBe('+0.41');
    expect(formatCompact(47816531)).toBe('47.8M');
  });

  it('renders missing values as n/a', () => {
    for (const f of [formatPercent, formatSignedPercent, formatPrice, formatRatio, formatCompact]) {
      expect(f(null)).toBe(NA);
    }
    expect(formatDate(null)).toBe(NA);
  });

  it('formats calendar dates without time zone shifts', () => {
    expect(formatDate('2025-01-02')).toBe('Jan 2, 2025');
    expect(formatDateRange('2025-01-02', '2025-04-08')).toBe('Jan 2 to Apr 8, 2025');
    expect(formatDateRange('2025-12-02', '2026-01-20')).toBe('Dec 2, 2025 to Jan 20, 2026');
    expect(MONTHS_SHORT[0]).toBe('Jan');
  });

  it('gives the sign of a value', () => {
    expect([sign(2), sign(-1), sign(0), sign(null)]).toEqual([1, -1, 0, 0]);
  });
});
