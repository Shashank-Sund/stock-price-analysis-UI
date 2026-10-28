export const TICKER_RE = /^[A-Za-z0-9.\-^=]{1,10}$/;

export function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Splits free text such as "aapl, msft goog" into normalized, non-empty tickers. */
export function splitTickers(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map(normalizeTicker)
    .filter(Boolean);
}

/** Appends tickers, keeping order and dropping duplicates. */
export function addTickers(existing: string[], incoming: string[]): string[] {
  const out = [...existing];
  for (const t of incoming.map(normalizeTicker)) {
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export function isValidTicker(t: string): boolean {
  return TICKER_RE.test(t);
}
