import { describe, expect, it, vi } from 'vitest';
import { clearRecent, loadRecent, pushRecent, RECENT_KEY } from './recent';

const q = (t: string, s = '2025-01-01', e = '2025-12-31') => ({ startDate: s, endDate: e, tickers: [t] });

describe('recent searches', () => {
  it('stores the newest first and caps at 5', () => {
    let list = loadRecent();
    for (const t of ['A', 'B', 'C', 'D', 'E', 'F']) list = pushRecent(list, q(t));
    expect(list.map((r) => r.tickers[0])).toEqual(['F', 'E', 'D', 'C', 'B']);
    expect(loadRecent()).toEqual(list);
  });

  it('moves a repeated query to the front instead of duplicating it', () => {
    let list = pushRecent([], q('A'));
    list = pushRecent(list, q('B'));
    list = pushRecent(list, q('A'));
    expect(list.map((r) => r.tickers[0])).toEqual(['A', 'B']);
  });

  it('ignores corrupt or malformed storage', () => {
    localStorage.setItem(RECENT_KEY, '{not json');
    expect(loadRecent()).toEqual([]);
    localStorage.setItem(RECENT_KEY, JSON.stringify([{ startDate: 'x' }, q('OK'), 42]));
    expect(loadRecent()).toEqual([q('OK')]);
  });

  it('survives localStorage throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(loadRecent()).toEqual([]);
    expect(pushRecent([], q('A'))).toEqual([q('A')]);
  });

  it('clears', () => {
    pushRecent([], q('A'));
    expect(clearRecent()).toEqual([]);
    expect(loadRecent()).toEqual([]);
  });
});
