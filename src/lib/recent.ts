import { readJSON, writeJSON, removeKey } from './storage';

export const RECENT_KEY = 'spa.recentSearches.v1';
export const RECENT_LIMIT = 5;

export interface RecentQuery {
  startDate: string;
  endDate: string;
  tickers: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecentQuery(v: unknown): v is RecentQuery {
  if (!v || typeof v !== 'object') return false;
  const q = v as Record<string, unknown>;
  return (
    typeof q.startDate === 'string' &&
    DATE_RE.test(q.startDate) &&
    typeof q.endDate === 'string' &&
    DATE_RE.test(q.endDate) &&
    Array.isArray(q.tickers) &&
    q.tickers.length > 0 &&
    q.tickers.every((t) => typeof t === 'string' && t.length > 0 && t.length <= 10)
  );
}

export function recentKey(q: RecentQuery): string {
  return `${q.tickers.join(',')}|${q.startDate}|${q.endDate}`;
}

export function loadRecent(): RecentQuery[] {
  const raw = readJSON<unknown>(RECENT_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecentQuery).slice(0, RECENT_LIMIT);
}

/** Returns the new list with `q` first, duplicates removed, capped at RECENT_LIMIT, and persists it. */
export function pushRecent(list: RecentQuery[], q: RecentQuery): RecentQuery[] {
  const entry = { startDate: q.startDate, endDate: q.endDate, tickers: [...q.tickers] };
  const key = recentKey(entry);
  const next = [entry, ...list.filter((r) => recentKey(r) !== key)].slice(0, RECENT_LIMIT);
  writeJSON(RECENT_KEY, next);
  return next;
}

export function clearRecent(): RecentQuery[] {
  removeKey(RECENT_KEY);
  return [];
}
