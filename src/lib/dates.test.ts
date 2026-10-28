import { describe, expect, it } from 'vitest';
import { formatDisplayDate, matchPreset, presetRange, subtractMonths, toISODate } from './dates';

const today = new Date(2026, 9, 27); // 2026-10-27

describe('presetRange', () => {
  it.each([
    ['1M', '2026-09-27'],
    ['6M', '2026-04-27'],
    ['YTD', '2026-01-01'],
    ['1Y', '2025-10-27'],
    ['5Y', '2021-10-27'],
  ] as const)('%s starts on %s and ends today', (id, start) => {
    expect(presetRange(id, today)).toEqual({ startDate: start, endDate: '2026-10-27' });
  });

  it('clamps month ends', () => {
    expect(toISODate(subtractMonths(new Date(2026, 2, 31), 1))).toBe('2026-02-28');
    expect(toISODate(subtractMonths(new Date(2024, 2, 31), 1))).toBe('2024-02-29');
    expect(presetRange('1Y', new Date(2024, 1, 29)).startDate).toBe('2023-02-28');
  });

  it('keeps YTD non-empty on January 1', () => {
    expect(presetRange('YTD', new Date(2026, 0, 1))).toEqual({ startDate: '2025-12-31', endDate: '2026-01-01' });
  });

  it('matches the active preset', () => {
    expect(matchPreset('2025-10-27', '2026-10-27', today)).toBe('1Y');
    expect(matchPreset('2025-10-26', '2026-10-27', today)).toBeNull();
  });

  it('formats dates for display', () => {
    expect(formatDisplayDate('2024-01-05')).toBe('Jan 5, 2024');
  });
});
