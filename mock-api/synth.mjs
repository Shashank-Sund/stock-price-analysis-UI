/**
 * Synthetic market data and the JSON response of the analysis API, built to the
 * contract in docker-lambda-aws3/docs/json-api.md (version 1). No dependencies.
 *
 * Prices are a deterministic simulation, not real market data: a market factor with
 * GARCH(1,1) volatility and a few stylized stress episodes, plus per ticker beta and
 * idiosyncratic noise. The same ticker and date always give the same numbers, so
 * different requests agree with each other. Statistics follow the backend's
 * definitions (pandas conventions: ddof=1, bias corrected skew and excess kurtosis,
 * linear quantiles, numpy style 40 bin histogram).
 */

const TRADING_DAYS = 252;
const RISK_FREE_RATE = 0.0;
const HISTOGRAM_BINS = 40;
const LOOKBACK_DAYS = 400; // calendar days of history before start (moving averages, rolling volatility)
export const BENCHMARK = 'SPY';
export const MAX_TICKERS = 10;
export const MAX_YEARS = 20;

// ---------------------------------------------------------------------------
// Random numbers

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

// ---------------------------------------------------------------------------
// Calendar

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s) => {
  const [y, m, d] = s.split(/[-/]/).map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

function isHoliday(d) {
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if ((m === 1 && day === 1) || (m === 7 && day === 4) || (m === 12 && day === 25)) return true;
  // Thanksgiving: fourth Thursday of November.
  if (m === 11 && d.getUTCDay() === 4 && day >= 22 && day <= 28) return true;
  return false;
}

let calendar = null;
function tradingCalendar() {
  if (calendar) return calendar;
  const out = [];
  for (let d = parse('1990-01-02'); d <= parse('2027-12-31'); d = new Date(d.getTime() + 86400000)) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6 && !isHoliday(d)) out.push(iso(d));
  }
  calendar = out;
  return out;
}

// ---------------------------------------------------------------------------
// Simulation

/** Stylized stress episodes for the market factor: [first day, trading days, total log return, vol multiplier]. */
const EPISODES = [
  ['2000-03-27', 380, -0.45, 1.4],
  ['2008-09-15', 45, -0.45, 2.6],
  ['2009-03-10', 60, 0.3, 1.6],
  ['2011-08-01', 10, -0.15, 2.2],
  ['2015-08-20', 5, -0.1, 2.0],
  ['2018-12-03', 15, -0.15, 1.8],
  ['2020-02-20', 23, -0.4, 3.2],
  ['2020-03-24', 50, 0.3, 1.8],
  ['2022-01-04', 190, -0.25, 1.4],
  ['2025-02-20', 33, -0.2, 2.0],
  ['2025-04-09', 1, 0.09, 1.0],
];

/** [beta, idiosyncratic annual vol, annual drift beyond beta, price on the anchor day, typical volume]. */
const PROFILES = {
  SPY: [1, 0, 0, 585, 72e6],
  QQQ: [1.18, 0.07, 0.03, 505, 40e6],
  AAPL: [1.12, 0.2, 0.06, 231.5, 55e6],
  MSFT: [1.05, 0.17, 0.07, 422.3, 22e6],
  GOOG: [1.1, 0.22, 0.05, 171.2, 24e6],
  GOOGL: [1.1, 0.22, 0.05, 170.1, 30e6],
  AMZN: [1.25, 0.25, 0.06, 189.7, 45e6],
  META: [1.3, 0.3, 0.08, 566.4, 15e6],
  NVDA: [1.75, 0.36, 0.25, 136.9, 260e6],
  TSLA: [1.85, 0.46, 0.06, 258.4, 95e6],
  JPM: [1.05, 0.17, 0.02, 221.8, 9e6],
  XOM: [0.8, 0.22, -0.01, 118.6, 15e6],
  KO: [0.55, 0.13, -0.01, 69.4, 13e6],
  NFLX: [1.35, 0.35, 0.08, 752.2, 4e6],
  BRK_B: [0.85, 0.12, 0.0, 462.1, 4e6],
};

/** Tickers that list part way through the calendar (to exercise null bars). */
const LISTED = { NEWCO: '2026-03-02' };

/** Tickers the mock pretends Yahoo has no data for. */
export function isUnknownTicker(t) {
  return /^(QX|ZZ)/.test(t) || ['ERR', 'XYZ', 'FAKE', 'NOPE'].includes(t);
}

function profileFor(symbol) {
  const known = PROFILES[symbol.replace('.', '_')];
  if (known) return known;
  const rng = mulberry32(hash(`profile:${symbol}`));
  return [0.6 + rng() * 1.0, 0.15 + rng() * 0.3, -0.03 + rng() * 0.12, 15 + rng() * 300, (2 + rng() * 30) * 1e6];
}

const ANCHOR_DAY = '2026-10-27';

function garch(rng, annualVol, n, volMult) {
  const v0 = (annualVol * annualVol) / TRADING_DAYS;
  const a = 0.08;
  const b = 0.9;
  const w = v0 * (1 - a - b);
  let v = v0;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(v) * gaussian(rng);
    // Stress multipliers scale the output only, so the variance recursion stays stable.
    out[i] = r * (volMult ? volMult[i] : 1);
    v = w + a * r * r + b * v;
  }
  return out;
}

let market = null;
function marketFactor() {
  if (market) return market;
  const days = tradingCalendar();
  const n = days.length;
  const drift = new Float64Array(n);
  const volMult = new Float64Array(n).fill(1);
  for (const [start, len, total, mult] of EPISODES) {
    const i0 = days.findIndex((d) => d >= start);
    if (i0 < 0) continue;
    for (let i = i0; i < Math.min(n, i0 + len); i++) {
      drift[i] += total / len;
      volMult[i] = mult;
    }
  }
  const shocks = garch(mulberry32(hash('market')), 0.14, n, volMult);
  market = Float64Array.from(shocks, (s, i) => s + drift[i]);
  // Calibrate the long run: about 9% a year in log terms from 1990 to the anchor day.
  const anchor = days.indexOf(ANCHOR_DAY);
  const total = market.slice(0, anchor + 1).reduce((s, x) => s + x, 0);
  const fix = (0.09 * (anchor / TRADING_DAYS) - total) / (anchor + 1);
  for (let i = 0; i < n; i++) market[i] += fix;
  return market;
}

const simCache = new Map();

/** Full simulated daily bars for a symbol over the whole calendar (from its listing day). */
function simulate(symbol) {
  if (simCache.has(symbol)) return simCache.get(symbol);
  const days = tradingCalendar();
  const m = marketFactor();
  const [beta, idioVol, alpha, anchorPrice, baseVolume] = profileFor(symbol);
  const rng = mulberry32(hash(`ticker:${symbol}`));
  const idio = idioVol > 0 ? garch(rng, idioVol, days.length) : new Float64Array(days.length);
  // Zero mean noise, so the long run return comes from beta and alpha.
  const idioMean = idio.reduce((s, x) => s + x, 0) / idio.length;
  for (let i = 0; i < idio.length; i++) idio[i] -= idioMean;
  const logRet = Float64Array.from(m, (x, i) => beta * x + idio[i] + alpha / TRADING_DAYS);

  const anchor = days.indexOf(ANCHOR_DAY);
  const cum = new Float64Array(days.length);
  for (let i = 1; i < days.length; i++) cum[i] = cum[i - 1] + logRet[i];

  const listed = LISTED[symbol] ?? '1990-01-01';
  const dailySd = Math.sqrt((beta * beta * 0.14 * 0.14 + idioVol * idioVol) / TRADING_DAYS);
  const bars = [];
  let prevClose = null;
  for (let i = 0; i < days.length; i++) {
    if (days[i] < listed) continue;
    const close = anchorPrice * Math.exp(cum[i] - cum[anchor]);
    const open = prevClose === null ? close * (1 - 0.004 * gaussian(rng)) : prevClose * Math.exp(0.3 * logRet[i] + 0.002 * gaussian(rng));
    const hi = Math.max(open, close) * (1 + Math.abs(gaussian(rng)) * 0.35 * dailySd);
    const lo = Math.min(open, close) * (1 - Math.abs(gaussian(rng)) * 0.35 * dailySd);
    const surprise = Math.abs(logRet[i]) / dailySd;
    const volume = Math.round(baseVolume * Math.exp(0.25 * gaussian(rng)) * (0.8 + 0.25 * surprise));
    bars.push({ date: days[i], open, high: hi, low: lo, close, volume });
    prevClose = close;
  }
  simCache.set(symbol, bars);
  return bars;
}

// ---------------------------------------------------------------------------
// Statistics (pandas conventions)

function round(v, digits = 6) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
const roundList = (vs, digits = 6) => vs.map((v) => round(v, digits));

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
function std(xs) {
  if (xs.length < 2) return null;
  const mu = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - mu) ** 2, 0) / (xs.length - 1));
}
function quantile(xs, q) {
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
function skew(xs) {
  const n = xs.length;
  if (n < 3) return null;
  const mu = mean(xs);
  const m2 = xs.reduce((s, x) => s + (x - mu) ** 2, 0) / n;
  const m3 = xs.reduce((s, x) => s + (x - mu) ** 3, 0) / n;
  if (m2 === 0) return null;
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * (m3 / m2 ** 1.5);
}
function kurtosis(xs) {
  const n = xs.length;
  if (n < 4) return null;
  const mu = mean(xs);
  const s2 = xs.reduce((s, x) => s + (x - mu) ** 2, 0) / (n - 1);
  if (s2 === 0) return null;
  const m4 = xs.reduce((s, x) => s + (x - mu) ** 4, 0);
  return ((n + 1) * n * m4) / ((n - 1) * (n - 2) * (n - 3) * s2 * s2) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}
function histogram(xs) {
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const width = (hi - lo) / HISTOGRAM_BINS || 1;
  const edges = Array.from({ length: HISTOGRAM_BINS + 1 }, (_, i) => lo + i * width);
  const counts = new Array(HISTOGRAM_BINS).fill(0);
  for (const x of xs) counts[Math.min(HISTOGRAM_BINS - 1, Math.floor((x - lo) / width))]++;
  return { edges: roundList(edges), counts };
}
function rolling(values, window, fn) {
  return values.map((_, i) => {
    if (i + 1 < window) return null;
    const slice = values.slice(i + 1 - window, i + 1);
    return slice.some((v) => v === null) ? null : fn(slice);
  });
}
function covariance(a, b) {
  const ma = mean(a);
  const mb = mean(b);
  return a.reduce((s, x, i) => s + (x - ma) * (b[i] - mb), 0) / (a.length - 1);
}
function corr(a, b) {
  const sa = std(a);
  const sb = std(b);
  return sa && sb ? covariance(a, b) / (sa * sb) : null;
}

/** Daily returns as a Map date -> return (first bar has none). */
function returnsMap(bars) {
  const out = new Map();
  for (let i = 1; i < bars.length; i++) out.set(bars[i].date, bars[i].close / bars[i - 1].close - 1);
  return out;
}

function alignedPairs(a, b) {
  const xs = [];
  const ys = [];
  for (const [d, v] of a) {
    if (b.has(d)) {
      xs.push(v);
      ys.push(b.get(d));
    }
  }
  return [xs, ys];
}

const monthKey = (d) => d.slice(0, 7);

function lastDayOfMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function monthlyReturns(bars, history, end) {
  if (!bars.length) return [];
  const months = [];
  for (const b of bars) {
    const k = monthKey(b.date);
    if (!months.length || months[months.length - 1].key !== k) months.push({ key: k, last: b.close });
    else months[months.length - 1].last = b.close;
  }
  const firstDay = bars[0].date;
  const startsMid = history.some((b) => monthKey(b.date) === monthKey(firstDay) && b.date < firstDay);
  const lastCovered = iso(new Date(parse(end).getTime() - 86400000));
  const lastKey = monthKey(bars[bars.length - 1].date);
  const [ly, lm] = lastKey.split('-').map(Number);
  const endsMid = monthKey(lastCovered) === lastKey && Number(lastCovered.slice(8)) < lastDayOfMonth(ly, lm);
  return months.map((mo, i) => {
    const prev = i === 0 ? bars[0].close : months[i - 1].last;
    const [y, m] = mo.key.split('-').map(Number);
    const partial = (i === 0 && startsMid) || (i === months.length - 1 && endsMid);
    return { year: y, month: m, return: round(mo.last / prev - 1), partial };
  });
}

function byMonth(monthly) {
  const out = [];
  for (let m = 1; m <= 12; m++) {
    const values = monthly.filter((r) => r.month === m && !r.partial && r.return !== null).map((r) => r.return);
    if (values.length) {
      out.push({
        month: m,
        average: round(mean(values)),
        positive: round(values.filter((v) => v > 0).length / values.length),
        years: values.length,
      });
    }
  }
  return out;
}

function maxDrawdown(bars) {
  let peakIdx = 0;
  let worst = 0;
  let worstPeak = null;
  let worstTrough = null;
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].close > bars[peakIdx].close) peakIdx = i;
    const dd = bars[i].close / bars[peakIdx].close - 1;
    if (dd < worst) {
      worst = dd;
      worstPeak = peakIdx;
      worstTrough = i;
    }
  }
  if (worstTrough === null) return { depth: 0, peak: null, trough: null, recovery: null };
  let recovery = null;
  for (let i = worstTrough; i < bars.length; i++) {
    if (bars[i].close >= bars[worstPeak].close) {
      recovery = bars[i].date;
      break;
    }
  }
  return { depth: worst, peak: bars[worstPeak].date, trough: bars[worstTrough].date, recovery };
}

function argBest(entries, cmp) {
  let best = null;
  for (const e of entries) if (best === null || cmp(e[1], best[1])) best = e;
  return best;
}

function tickerData(symbol, allBars, start, end, { isBenchmark, benchReturns, benchTotal, weekly = false }) {
  const lookbackStart = iso(new Date(parse(start).getTime() - LOOKBACK_DAYS * 86400000));
  const history = allBars.filter((b) => b.date >= lookbackStart && b.date < end);
  const closesAll = history.map((b) => b.close);
  const sma50All = rolling(closesAll, 50, mean);
  const sma200All = rolling(closesAll, 200, mean);
  const pctAll = closesAll.map((c, i) => (i === 0 ? null : c / closesAll[i - 1] - 1));
  const volAll = rolling(pctAll, 30, std).map((s) => (s === null ? null : s * Math.sqrt(TRADING_DAYS)));

  const offset = history.findIndex((b) => b.date >= start);
  const bars = offset < 0 ? [] : history.slice(offset);
  const sl = (arr) => (offset < 0 ? [] : arr.slice(offset));
  const rets = returnsMap(bars);
  const retValues = [...rets.values()];
  const n = retValues.length;
  const first = bars[0];
  const last = bars[bars.length - 1];
  const total = bars.length ? last.close / first.close - 1 : null;
  const annual = n >= 1 && total !== null && total > -1 ? (1 + total) ** (TRADING_DAYS / n) - 1 : null;
  const vol = n >= 2 ? std(retValues) * Math.sqrt(TRADING_DAYS) : null;
  const sharpe = vol ? (mean(retValues) * TRADING_DAYS - RISK_FREE_RATE) / vol : null;
  const dd = maxDrawdown(bars);
  let peak = -Infinity;
  const drawdown = bars.map((b) => {
    peak = Math.max(peak, b.close);
    return b.close / peak - 1;
  });

  let beta = null;
  if (benchReturns) {
    if (isBenchmark) beta = 1;
    else {
      const [xs, ys] = alignedPairs(rets, benchReturns);
      const v = xs.length >= 2 ? std(ys) ** 2 : 0;
      beta = v ? covariance(xs, ys) / v : null;
    }
  }
  const excess = benchReturns ? (total !== null && benchTotal !== null ? total - benchTotal : null) : null;

  const best = argBest(rets, (a, b) => a > b);
  const worst = argBest(rets, (a, b) => a < b);
  const hiBar = bars.reduce((a, b) => (a === null || b.close > a.close ? b : a), null);
  const loBar = bars.reduce((a, b) => (a === null || b.close < a.close ? b : a), null);
  const stats = n >= 2;
  const monthly = monthlyReturns(bars, history, end);

  // Weekly bars: one per calendar week, dated by its last trading day. Daily series are
  // sampled at that day; OHLCV aggregates the week.
  const daily = bars.map((b, i) => ({
    ...b,
    sma50: sl(sma50All)[i],
    sma200: sl(sma200All)[i],
    vol: sl(volAll)[i],
    drawdown: drawdown[i],
  }));
  const shown = weekly ? toWeekly(daily) : daily;

  return {
    symbol,
    is_benchmark: isBenchmark,
    prices: {
      date: shown.map((b) => b.date),
      open: roundList(shown.map((b) => b.open), 4),
      high: roundList(shown.map((b) => b.high), 4),
      low: roundList(shown.map((b) => b.low), 4),
      close: roundList(shown.map((b) => b.close), 4),
      volume: shown.map((b) => b.volume),
      sma50: roundList(shown.map((b) => b.sma50), 4),
      sma200: roundList(shown.map((b) => b.sma200), 4),
    },
    summary: {
      start_date: first ? first.date : null,
      end_date: last ? last.date : null,
      start_price: first ? round(first.close, 4) : null,
      end_price: last ? round(last.close, 4) : null,
      total_return: round(total),
      annual_return: round(annual),
      annual_volatility: round(vol),
      sharpe: round(sharpe),
      max_drawdown: round(dd.depth),
      max_drawdown_peak: dd.peak,
      max_drawdown_trough: dd.trough,
      max_drawdown_recovery: dd.recovery,
      best_day: best ? { date: best[0], return: round(best[1]) } : null,
      worst_day: worst ? { date: worst[0], return: round(worst[1]) } : null,
      high: hiBar ? { date: hiBar.date, price: round(hiBar.close, 4) } : null,
      low: loBar ? { date: loBar.date, price: round(loBar.close, 4) } : null,
      positive_days: n ? round(retValues.filter((v) => v > 0).length / n) : null,
      avg_volume: bars.length ? Math.round(mean(bars.map((b) => b.volume))) : null,
      trading_days: bars.length,
      beta: round(beta),
      excess_return: round(excess),
    },
    returns: {
      histogram: stats ? histogram(retValues) : { edges: [], counts: [] },
      mean: stats ? round(mean(retValues)) : null,
      median: stats ? round(quantile(retValues, 0.5)) : null,
      std: stats ? round(std(retValues)) : null,
      skew: stats ? round(skew(retValues)) : null,
      kurtosis: stats ? round(kurtosis(retValues)) : null,
      var_95: stats ? round(quantile(retValues, 0.05)) : null,
    },
    risk: {
      rolling_volatility: roundList(shown.map((b) => b.vol)),
      drawdown: roundList(shown.map((b) => b.drawdown)),
    },
    seasonality: { monthly, by_month: byMonth(monthly) },
    _rets: rets,
    _bars: shown,
    _firstClose: first ? first.close : null,
  };
}

/** Monday of the week (UTC) as YYYY-MM-DD: the grouping key for weekly bars. */
function weekKey(date) {
  const d = parse(date);
  return iso(new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000));
}

function toWeekly(daily) {
  const out = [];
  let key = null;
  for (const b of daily) {
    const k = weekKey(b.date);
    if (k !== key) {
      out.push({ ...b });
      key = k;
    } else {
      const w = out[out.length - 1];
      Object.assign(w, {
        date: b.date,
        high: Math.max(w.high, b.high),
        low: Math.min(w.low, b.low),
        close: b.close,
        volume: w.volume + b.volume,
        sma50: b.sma50,
        sma200: b.sma200,
        vol: b.vol,
        drawdown: b.drawdown,
      });
    }
  }
  return out;
}

function compare(symbols, data) {
  const dates = [...new Set(symbols.flatMap((s) => data[s]._bars.map((b) => b.date)))].sort();
  const values = {};
  for (const s of symbols) {
    const byDate = new Map(data[s]._bars.map((b) => [b.date, b.close]));
    // Measured from the first DAILY close in range, also when bars are weekly.
    const base = data[s]._firstClose;
    values[s] = dates.map((d) => (byDate.has(d) && base ? round(byDate.get(d) / base - 1) : null));
  }
  // Inner join of daily returns across all symbols.
  const common = [...data[symbols[0]]._rets.keys()].filter((d) => symbols.every((s) => data[s]._rets.has(d)));
  const matrix = symbols.map((a) =>
    symbols.map((b) => {
      if (common.length < 3) return null;
      return round(
        corr(
          common.map((d) => data[a]._rets.get(d)),
          common.map((d) => data[b]._rets.get(d)),
        ),
      );
    }),
  );
  return {
    cumulative_return: { date: dates, values },
    correlation: { symbols, matrix },
    risk_return: symbols.map((s) => ({
      symbol: s,
      annual_return: data[s].summary.annual_return,
      annual_volatility: data[s].summary.annual_volatility,
      sharpe: data[s].summary.sharpe,
    })),
  };
}

// ---------------------------------------------------------------------------
// Request handling

export class InputError extends Error {}

export const WEEKLY_AFTER_YEARS = 5;

/** Ranges longer than 5 years get weekly bars (start earlier than end minus 5 years). */
export function isWeeklyRange(start, end) {
  const limit = parse(end);
  limit.setUTCFullYear(limit.getUTCFullYear() - WEEKLY_AFTER_YEARS);
  return parse(start) < limit;
}

/** Mirrors the backend's request parsing: returns {start, end, symbols} or throws InputError. */
export function parseRequest(event) {
  const start = String(event.start_date ?? '').trim();
  const end = String(event.end_date ?? '').trim();
  const symbols = [
    ...new Set(
      String(event.symbol ?? '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (!start || !end || !symbols.length) {
    throw new InputError('Please enter a start date, an end date and at least one ticker.');
  }
  const ok = (s) => /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s) && !Number.isNaN(parse(s).getTime());
  if (!ok(start) || !ok(end)) throw new InputError('Dates must be in YYYY-MM-DD format.');
  const s = iso(parse(start));
  const e = iso(parse(end));
  if (s >= e) throw new InputError('The start date must be before the end date.');
  // Like the backend: every symbol counts, SPY included.
  if (symbols.length > MAX_TICKERS) {
    throw new InputError(`Enter at most ${MAX_TICKERS} tickers.`);
  }
  const limit = parse(s);
  limit.setUTCFullYear(limit.getUTCFullYear() + MAX_YEARS);
  if (parse(e) > limit) throw new InputError(`The date range can be at most ${MAX_YEARS} years.`);
  return { start: s, end: e, symbols };
}

/**
 * Builds the success body for a request, or throws InputError.
 * `today` (YYYY-MM-DD) caps the data: bars exist only before it, like a live data source.
 */
export function buildResponse(event, { today, benchmarkAvailable = true } = {}) {
  const { start, end, symbols } = parseRequest(event);
  const weekly = isWeeklyRange(start, end);
  const cap = today && today < end ? today : end;
  const bars = {};
  const missing = [];
  for (const s of symbols) {
    if (isUnknownTicker(s)) {
      missing.push(s);
      continue;
    }
    bars[s] = simulate(s).filter((b) => b.date < cap);
    if (!bars[s].some((b) => b.date >= start)) missing.push(s);
  }
  if (missing.length) {
    throw new InputError(
      `No data found for ${missing.join(', ')} between ${start} and ${end}. Check the ticker symbol and the date range.`,
    );
  }

  const withBench = benchmarkAvailable || symbols.includes(BENCHMARK);
  const spyBars = withBench ? (bars[BENCHMARK] ?? simulate(BENCHMARK).filter((b) => b.date < cap)) : null;
  const spy = spyBars
    ? tickerData(BENCHMARK, spyBars, start, end, { isBenchmark: !symbols.includes(BENCHMARK), benchReturns: null, benchTotal: null, weekly })
    : null;
  const benchReturns = spy ? spy._rets : null;
  const benchTotal = spy ? spy.summary.total_return : null;

  const data = {};
  for (const s of symbols) {
    data[s] =
      s === BENCHMARK && spy
        ? null
        : tickerData(s, bars[s], start, end, { isBenchmark: false, benchReturns, benchTotal, weekly });
  }
  if (spy) {
    // Re-run SPY with itself as the benchmark so beta is 1 and excess return 0.
    data[BENCHMARK] = tickerData(BENCHMARK, spyBars, start, end, {
      isBenchmark: !symbols.includes(BENCHMARK),
      benchReturns,
      benchTotal,
      weekly,
    });
  }
  const keys = [...symbols, ...(spy && !symbols.includes(BENCHMARK) ? [BENCHMARK] : [])];
  const cmp = compare(keys, data);
  const series = {};
  for (const k of keys) {
    const { _rets, _bars, _firstClose, ...rest } = data[k];
    void _rets;
    void _bars;
    void _firstClose;
    series[k] = rest;
  }
  return {
    version: 1,
    start_date: start,
    end_date: end,
    tickers: symbols,
    benchmark_symbol: BENCHMARK,
    risk_free_rate: RISK_FREE_RATE,
    trading_days_per_year: TRADING_DAYS,
    interval: weekly ? '1wk' : '1d',
    series,
    benchmark: spy ? BENCHMARK : null,
    compare: cmp,
  };
}

/** The Lambda return value (what API Gateway and the local emulator send as the HTTP body). */
export function envelope(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

/** Lambda handler equivalent: never throws. */
export function handleJson(event, opts) {
  try {
    return envelope(200, buildResponse(event, opts));
  } catch (e) {
    if (e instanceof InputError) return envelope(400, { error: e.message });
    console.error(e);
    return envelope(500, {
      error: 'Something went wrong while building the charts. Please try again, or try a different date range.',
    });
  }
}
