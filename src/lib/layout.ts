import type { AnalysisRequest } from './api';

/** Odd counts get a full width lead chart so the two column grid has no orphan. */
export function isWide(index: number, count: number) {
  return index === 0 && count % 2 === 1;
}

/** How many skeleton cards to show while a query runs (mirrors the backend output). */
export function expectedChartCount(q: AnalysisRequest | null) {
  if (!q) return 0;
  return q.tickers.length > 1 ? 1 : 5;
}

export function figureAspect(wide: boolean) {
  return wide ? 'aspect-[5/3] lg:aspect-[2/1]' : 'aspect-[5/3]';
}
