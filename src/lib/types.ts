/**
 * Types for the JSON response of the analysis API (`"format": "json"`).
 * Source of truth: docker-lambda-aws3/docs/json-api.md (version 1).
 *
 * Returns and ratios are fractions (0.0123 = 1.23%). Anything that cannot be
 * computed is null, so every number below is nullable unless the contract
 * guarantees it.
 */

export type Num = number | null;

export type Interval = '1d' | '1wk';

export interface DatedReturn {
  date: string;
  return: Num;
}

export interface DatedPrice {
  date: string;
  price: Num;
}

/** One element per bar. Daily bars, or weekly bars dated by the last trading day of the week. */
export interface Prices {
  date: string[];
  open: Num[];
  high: Num[];
  low: Num[];
  close: Num[];
  volume: Num[];
  sma50: Num[];
  sma200: Num[];
}

export interface Summary {
  start_date: string | null;
  end_date: string | null;
  start_price: Num;
  end_price: Num;
  total_return: Num;
  annual_return: Num;
  annual_volatility: Num;
  sharpe: Num;
  max_drawdown: Num;
  max_drawdown_peak: string | null;
  max_drawdown_trough: string | null;
  max_drawdown_recovery: string | null;
  best_day: DatedReturn | null;
  worst_day: DatedReturn | null;
  high: DatedPrice | null;
  low: DatedPrice | null;
  positive_days: Num;
  avg_volume: Num;
  trading_days: number;
  beta: Num;
  excess_return: Num;
}

export interface Histogram {
  /** Bin edges; edges.length === counts.length + 1. */
  edges: number[];
  counts: number[];
}

/** Statistics of DAILY returns (always daily, whatever the bar interval). */
export interface Returns {
  histogram: Histogram;
  mean: Num;
  median: Num;
  std: Num;
  skew: Num;
  /** Excess kurtosis (normal = 0). */
  kurtosis: Num;
  /** 5th percentile daily return (historical value at risk). */
  var_95: Num;
}

/** Aligned index for index with prices.date (sampled at each bar when the interval is weekly). */
export interface Risk {
  rolling_volatility: Num[];
  drawdown: Num[];
}

export interface MonthlyReturn {
  year: number;
  /** 1 to 12. */
  month: number;
  return: Num;
  partial: boolean;
}

export interface MonthAverage {
  month: number;
  average: Num;
  positive: Num;
  years: number;
}

export interface Seasonality {
  monthly: MonthlyReturn[];
  by_month: MonthAverage[];
}

export interface TickerData {
  symbol: string;
  is_benchmark: boolean;
  prices: Prices;
  summary: Summary;
  returns: Returns;
  risk: Risk;
  seasonality: Seasonality;
}

export interface RiskReturnPoint {
  symbol: string;
  annual_return: Num;
  annual_volatility: Num;
  sharpe: Num;
}

export interface Compare {
  cumulative_return: {
    date: string[];
    values: Record<string, Num[]>;
  };
  correlation: {
    symbols: string[];
    matrix: Num[][];
  };
  risk_return: RiskReturnPoint[];
}

export interface AnalysisResponse {
  version: number;
  start_date: string;
  end_date: string;
  tickers: string[];
  benchmark_symbol: string;
  risk_free_rate: number;
  trading_days_per_year: number;
  /** Bar interval of prices, risk and compare.cumulative_return: weekly for ranges longer than 5 years. */
  interval: Interval;
  series: Record<string, TickerData>;
  /** Key into series, or null when the benchmark could not be fetched. */
  benchmark: string | null;
  compare: Compare;
}
