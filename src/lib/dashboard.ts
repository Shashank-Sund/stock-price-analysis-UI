/** View model helpers shared by the dashboard components. */
import type { AnalysisRequest } from './api';
import type { AnalysisResponse, TickerData } from './types';

export const BENCHMARK = 'SPY';
export const SLOTS = 8;

export interface SeriesStyle {
  /** CSS color (a custom property reference), usable in SVG and resolvable for canvas. */
  color: string;
  /** Dashed lines: the benchmark, and tickers 9 and 10, which reuse slots 1 and 2. */
  dashed: boolean;
  benchmark: boolean;
}

export interface DashboardView {
  /** Tickers the user asked for, in their order. Includes SPY only when the user entered it. */
  tickers: string[];
  /** The benchmark series when it is not one of the user's tickers. */
  benchmark: TickerData | null;
  /** True when the user entered SPY (it is then shown once, as a regular ticker). */
  userHasBenchmark: boolean;
  /** False when SPY could not be fetched. */
  benchmarkAvailable: boolean;
  styles: Record<string, SeriesStyle>;
  /** Every symbol drawn in comparisons: tickers, then the benchmark if separate. */
  symbols: string[];
}

export function tickerStyle(index: number): SeriesStyle {
  return { color: `var(--series-${(index % SLOTS) + 1})`, dashed: index >= SLOTS, benchmark: false };
}

export const BENCHMARK_STYLE: SeriesStyle = { color: 'var(--series-bench)', dashed: true, benchmark: true };

export function buildView(data: AnalysisResponse, query?: AnalysisRequest | null): DashboardView {
  const tickers = data.tickers.filter((t) => data.series[t]);
  const benchKey = data.benchmark;
  // The client leaves SPY out of the request when other tickers are present; put it back
  // where the user typed it.
  const queried = query?.tickers ?? [];
  if (benchKey && queried.includes(benchKey) && !tickers.includes(benchKey) && data.series[benchKey]) {
    const pos = queried.filter((t) => t === benchKey || tickers.includes(t)).indexOf(benchKey);
    tickers.splice(Math.max(0, pos), 0, benchKey);
  }
  const userHasBenchmark = benchKey !== null && tickers.includes(benchKey);
  const benchmark = benchKey && !userHasBenchmark ? (data.series[benchKey] ?? null) : null;

  // SPY always looks like the benchmark (gray, dashed), even when the user entered it,
  // and does not use up a categorical slot.
  const styles: Record<string, SeriesStyle> = {};
  let slot = 0;
  for (const t of tickers) styles[t] = t === benchKey ? BENCHMARK_STYLE : tickerStyle(slot++);
  if (benchmark) styles[benchmark.symbol] = BENCHMARK_STYLE;

  return {
    tickers,
    benchmark,
    userHasBenchmark,
    benchmarkAvailable: benchKey !== null && Boolean(data.series[benchKey]),
    styles,
    symbols: benchmark ? [...tickers, benchmark.symbol] : tickers,
  };
}
