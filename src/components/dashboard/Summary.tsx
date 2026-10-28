/** Summary: KPI cards for one ticker, a compact table for several. */
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { InfoHint } from '@/components/ui/info-hint';
import { cn } from '@/lib/utils';
import { BENCHMARK, type DashboardView } from '@/lib/dashboard';
import {
  formatDate,
  formatDateRange,
  formatDay,
  formatInteger,
  formatPercent,
  formatPrice,
  formatRatio,
  formatSignedPercent,
} from '@/lib/format';
import { HINTS } from '@/lib/hints';
import type { AnalysisResponse, TickerData } from '@/lib/types';
import { Change, SectionHeading, SeriesKey } from './parts';

function Kpi({ label, hint, detail, children }: { label: string; hint: string; detail?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border bg-card p-3.5 shadow-card sm:p-4">
      <dt className="text-[13px] leading-tight text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 flex min-w-0 flex-1 flex-col">
        <div className="text-lg leading-tight font-semibold tracking-tight sm:text-2xl">{children}</div>
        {detail && <div className="mt-1 text-xs leading-snug text-muted-foreground tabular-nums">{detail}</div>}
        <p className="mt-auto pt-2 text-xs leading-snug text-muted-foreground/90">{hint}</p>
      </dd>
    </div>
  );
}

function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-normal text-muted-foreground">{label}</span>
      <span>{children}</span>
    </span>
  );
}

function benchmarkKpi(t: TickerData, view: DashboardView) {
  if (t.symbol === BENCHMARK) {
    return (
      <Kpi label="Versus SPY" hint="SPY tracks the S&P 500 and is the benchmark for every other ticker.">
        <span className="text-base font-medium sm:text-lg">SPY is the benchmark</span>
      </Kpi>
    );
  }
  if (!view.benchmarkAvailable) {
    return (
      <Kpi label="Versus SPY" hint="Beta and return versus SPY need SPY prices for the same dates.">
        <span className="text-base font-medium sm:text-lg">SPY data unavailable</span>
      </Kpi>
    );
  }
  return (
    <Kpi
      label="Versus SPY"
      hint={HINTS.vsSpy}
      detail={view.benchmark ? <>SPY returned {formatSignedPercent(view.benchmark.summary.total_return)}</> : undefined}
    >
      <span className="flex flex-col gap-0.5 text-base sm:text-lg">
        <Pair label="Beta">{formatRatio(t.summary.beta)}</Pair>
        <Pair label="Return vs SPY">
          <Change value={t.summary.excess_return} />
        </Pair>
      </span>
    </Kpi>
  );
}

export function SummaryCards({ ticker: t, view }: { ticker: TickerData; view: DashboardView }) {
  const s = t.summary;
  // Short dates (no year) only when the whole range is inside one calendar year.
  const oneYear = (s.start_date ?? '').slice(0, 4) === (s.end_date ?? '').slice(0, 4);
  const day = (d: string) => (oneYear ? formatDay(d) : formatDate(d));
  const recovered = s.max_drawdown_recovery
    ? `recovered ${formatDate(s.max_drawdown_recovery)}`
    : s.max_drawdown_peak
      ? 'not yet recovered'
      : null;
  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
      <SectionHeading
        id="summary-heading"
        title={`${t.symbol} at a glance`}
        description={`${formatDateRange(s.start_date, s.end_date)}, ${formatInteger(s.trading_days)} trading days`}
      />
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Total return"
          hint={HINTS.totalReturn}
          detail={`${formatPrice(s.start_price)} to ${formatPrice(s.end_price)}`}
        >
          <Change value={s.total_return} arrow />
        </Kpi>
        <Kpi label="Annual return" hint={HINTS.annualReturn} detail="Compound growth per year">
          <Change value={s.annual_return} />
        </Kpi>
        <Kpi label="Annual volatility" hint={HINTS.annualVolatility} detail={`Daily std. dev. ${formatPercent(t.returns.std)}`}>
          {formatPercent(s.annual_volatility)}
        </Kpi>
        <Kpi label="Sharpe (risk-free 0%)" hint={HINTS.sharpe}>
          {formatRatio(s.sharpe)}
        </Kpi>
        <Kpi
          label="Max drawdown"
          hint={HINTS.maxDrawdown}
          detail={
            s.max_drawdown_peak ? (
              <>
                {formatDateRange(s.max_drawdown_peak, s.max_drawdown_trough)}
                {recovered && <>, {recovered}</>}
              </>
            ) : (
              'No decline from a peak'
            )
          }
        >
          <Change value={s.max_drawdown} />
        </Kpi>
        <Kpi label="Best and worst day" hint={HINTS.bestWorst}>
          <span className="flex flex-col gap-0.5 text-base sm:text-lg">
            <Pair label={s.best_day ? day(s.best_day.date) : 'Best'}>
              <Change value={s.best_day?.return ?? null} />
            </Pair>
            <Pair label={s.worst_day ? day(s.worst_day.date) : 'Worst'}>
              <Change value={s.worst_day?.return ?? null} />
            </Pair>
          </span>
        </Kpi>
        <Kpi label="Period high and low" hint={HINTS.highLow}>
          <span className="flex flex-col gap-0.5 text-base tabular-nums sm:text-lg">
            <Pair label={s.high ? `High, ${day(s.high.date)}` : 'High'}>{formatPrice(s.high?.price)}</Pair>
            <Pair label={s.low ? `Low, ${day(s.low.date)}` : 'Low'}>{formatPrice(s.low?.price)}</Pair>
          </span>
        </Kpi>
        {benchmarkKpi(t, view)}
      </dl>
    </section>
  );
}

const COLUMNS = [
  { key: 'last', label: 'Last close', hint: HINTS.lastClose },
  { key: 'total', label: 'Total return', hint: HINTS.totalReturn },
  { key: 'annual', label: 'Annual return', hint: HINTS.annualReturn },
  { key: 'vol', label: 'Volatility', hint: HINTS.annualVolatility },
  { key: 'sharpe', label: 'Sharpe (risk-free 0%)', hint: HINTS.sharpe },
  { key: 'mdd', label: 'Max drawdown', hint: HINTS.maxDrawdown },
  { key: 'beta', label: 'Beta', hint: HINTS.beta },
  { key: 'excess', label: 'Return vs SPY', hint: HINTS.excessReturn },
] as const;

function Row({
  t,
  view,
  benchmark,
  active,
  onSelect,
}: {
  t: TickerData;
  view: DashboardView;
  benchmark?: boolean;
  active?: boolean;
  onSelect?: () => void;
}) {
  const s = t.summary;
  const isSpy = t.symbol === BENCHMARK;
  const cell = 'px-3 py-2.5 text-right tabular-nums whitespace-nowrap';
  return (
    <tr className={cn('border-t', benchmark && 'bg-muted/40 text-muted-foreground')}>
      <th
        scope="row"
        className={cn(
          'sticky left-0 z-[1] bg-card px-3 py-2 text-left font-normal',
          benchmark && 'bg-[color-mix(in_oklch,var(--muted)_40%,var(--card))]',
        )}
      >
        <span className="flex items-center gap-2">
          <SeriesKey style={view.styles[t.symbol]} />
          {onSelect ? (
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={active}
              aria-label={`Show ${t.symbol} charts`}
              className={cn(
                'rounded-sm font-mono text-sm font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60',
                active && 'underline decoration-2',
              )}
            >
              {t.symbol}
            </button>
          ) : (
            <span className="font-mono text-sm font-semibold">{t.symbol}</span>
          )}
          {benchmark && (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              Benchmark
            </Badge>
          )}
        </span>
      </th>
      <td className={cell}>{formatPrice(s.end_price)}</td>
      <td className={cell}>
        <Change value={s.total_return} />
      </td>
      <td className={cell}>
        <Change value={s.annual_return} />
      </td>
      <td className={cell}>{formatPercent(s.annual_volatility)}</td>
      <td className={cell}>{formatRatio(s.sharpe)}</td>
      <td className={cell}>
        <Change value={s.max_drawdown} />
      </td>
      <td className={cell}>{isSpy ? '1.00' : formatRatio(s.beta)}</td>
      <td className={cell}>{isSpy ? <span className="text-muted-foreground">benchmark</span> : <Change value={s.excess_return} />}</td>
    </tr>
  );
}

export function SummaryTable({
  data,
  view,
  active,
  onSelect,
}: {
  data: AnalysisResponse;
  view: DashboardView;
  active: string;
  onSelect: (t: string) => void;
}) {
  const first = data.series[view.tickers[0]].summary;
  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
      <SectionHeading
        id="summary-heading"
        title="Summary"
        description={`${formatDateRange(first.start_date, first.end_date)}. Select a ticker to show its charts.`}
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <caption className="sr-only">Summary statistics per ticker, with SPY as the benchmark</caption>
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="sticky left-0 z-[1] bg-card px-3 py-2.5 text-left font-medium">
                  Ticker
                </th>
                {COLUMNS.map((c) => (
                  <th key={c.key} scope="col" className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    <span className="inline-flex items-center justify-end gap-0.5">
                      {c.label}
                      <InfoHint label={c.label}>{c.hint}</InfoHint>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.tickers.map((t) => (
                <Row key={t} t={data.series[t]} view={view} active={t === active} onSelect={() => onSelect(t)} />
              ))}
              {view.benchmark && <Row t={view.benchmark} view={view} benchmark />}
            </tbody>
          </table>
        </div>
        {!view.benchmarkAvailable && (
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            SPY data was not available, so beta and return versus SPY are missing.
          </p>
        )}
      </Card>
    </section>
  );
}
