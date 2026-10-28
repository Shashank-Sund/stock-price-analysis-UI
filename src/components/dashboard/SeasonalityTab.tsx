/** Seasonality tab: monthly returns heatmap (years by months) and the average return by calendar month. */
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useMediaQuery, useReducedMotion } from '@/hooks/useMedia';
import { formatPercent, formatSignedPercent, formatTickPercent, MONTHS_LONG, MONTHS_SHORT } from '@/lib/format';
import { byMonthSummary, heatmapSummary } from '@/lib/summaries';
import { buildHeatmap, divergingColor } from '@/lib/transforms';
import { cn } from '@/lib/utils';
import type { MonthAverage } from '@/lib/types';
import { Panel } from './Panel';
import { yAxisBase } from './chart-axes';
import type { TabProps } from './ReturnsTab';

function Legend({ scale }: { scale: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span className="tabular-nums">{formatSignedPercent(-scale, 0)}</span>
        <span
          aria-hidden="true"
          className="h-2.5 w-28 rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--div-neg), var(--div-mid), var(--div-pos))' }}
        />
        <span className="tabular-nums">{formatSignedPercent(scale, 0)}</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-block size-3 rounded-[3px] border border-dashed border-foreground/50" />
        Partial month or year (marked *): the range starts or ends inside it
      </span>
    </div>
  );
}

function Heatmap({ ticker }: { ticker: TabProps['ticker'] }) {
  const grid = useMemo(() => buildHeatmap(ticker.seasonality.monthly), [ticker]);
  const cell = 'h-9 min-w-[3.4rem] px-1 text-center text-[11px] font-medium tabular-nums sm:text-xs';
  return (
    <div className="flex flex-col gap-3">
      {/* Phones: one block per year, months in a 6 by 2 grid. */}
      <div className="flex flex-col gap-3 px-2 sm:hidden">
        {grid.rows.map((row) => (
          <section key={row.year} aria-label={`${row.year} monthly returns`}>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <h5 className="font-semibold tabular-nums">{row.year}</h5>
              <span className="text-muted-foreground">
                Year{' '}
                <span className={cn('font-semibold tabular-nums', row.total !== null && row.total > 0 && 'text-positive', row.total !== null && row.total < 0 && 'text-negative')}>
                  {formatSignedPercent(row.total, 1)}
                </span>
                {row.totalPartial && '*'}
              </span>
            </div>
            <ul className="grid grid-cols-6 gap-1">
              {row.cells.map((c, i) => {
                const { background, strong } = c ? divergingColor(c.value, grid.scale) : { background: 'transparent', strong: false };
                return (
                  <li
                    key={i}
                    className={cn(
                      'flex h-11 flex-col items-center justify-center rounded-[4px] text-[11px] leading-tight tabular-nums',
                      !c && 'border border-dashed border-border text-muted-foreground/60',
                      c && (strong ? 'text-white' : 'text-foreground'),
                      c?.partial && 'outline-1 -outline-offset-1 outline-dashed outline-foreground/50',
                    )}
                    style={{ background }}
                  >
                    <span className={cn('text-[10px]', c ? 'opacity-80' : '')}>{MONTHS_SHORT[i]}</span>
                    {c ? (
                      <span className="font-medium">
                        {formatSignedPercent(c.value, 1)}
                        {c.partial && <span aria-label=", partial month">*</span>}
                      </span>
                    ) : (
                      <span className="sr-only">not in range</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <div className="hidden overflow-x-auto px-2 pb-1 sm:block">
        <table className="w-full border-separate border-spacing-[3px] text-xs">
          <caption className="sr-only">{`${ticker.symbol} monthly returns by year`}</caption>
          <thead>
            <tr className="text-muted-foreground">
              <th scope="col" className="sticky left-0 z-[1] bg-card pr-2 text-left font-medium">
                Year
              </th>
              {MONTHS_SHORT.map((m, i) => (
                <th key={m} scope="col" className="font-medium" abbr={MONTHS_LONG[i]}>
                  {m}
                </th>
              ))}
              <th scope="col" className="pl-2 font-medium">
                Year total
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={row.year}>
                <th scope="row" className="sticky left-0 z-[1] bg-card pr-2 text-left font-medium tabular-nums">
                  {row.year}
                </th>
                {row.cells.map((c, i) => {
                  if (!c) return <td key={i} className={cell} aria-label={`${MONTHS_LONG[i]} ${row.year}: not in range`} />;
                  const { background, strong } = divergingColor(c.value, grid.scale);
                  return (
                    <td
                      key={i}
                      className={cn(
                        cell,
                        'rounded-[4px]',
                        strong ? 'text-white' : 'text-foreground',
                        c.partial && 'outline-1 -outline-offset-1 outline-dashed outline-foreground/50',
                      )}
                      style={{ background }}
                      title={`${MONTHS_LONG[i]} ${row.year}: ${formatSignedPercent(c.value)}${c.partial ? ' (partial month)' : ''}`}
                    >
                      {formatSignedPercent(c.value, 1)}
                      {c.partial && <span aria-label=", partial month">*</span>}
                    </td>
                  );
                })}
                <td className={cn(cell, 'pl-2 font-semibold')}>
                  <span className={cn(row.total !== null && row.total > 0 && 'text-positive', row.total !== null && row.total < 0 && 'text-negative')}>
                    {formatSignedPercent(row.total, 1)}
                  </span>
                  {row.totalPartial && <span aria-label=", partial year">*</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Legend scale={grid.scale} />
    </div>
  );
}

function ByMonth({ ticker, narrow }: TabProps & { narrow: boolean }) {
  const reducedMotion = useReducedMotion();
  const data = useMemo(() => {
    const by = new Map(ticker.seasonality.by_month.map((m) => [m.month, m]));
    return MONTHS_SHORT.map((label, i) => ({ label, ...(by.get(i + 1) ?? { month: i + 1, average: null, positive: null, years: 0 }) }));
  }, [ticker]);
  const config: ChartConfig = { average: { label: 'Average return' } };
  if (!ticker.seasonality.by_month.length) {
    return <p className="px-2 py-10 text-center text-sm text-muted-foreground">Needs at least one full calendar month in the range.</p>;
  }
  return (
    <ChartContainer config={config} className="h-[240px] sm:h-[280px]">
      <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={11} tickFormatter={(v: string) => (narrow ? v.slice(0, 1) : v)} />
        <YAxis {...yAxisBase} width={48} tickFormatter={formatTickPercent} />
        <ReferenceLine y={0} strokeOpacity={0.6} />
        <ChartTooltip
          cursor
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_l, p) => MONTHS_LONG[((p[0]?.payload as MonthAverage | undefined)?.month ?? 1) - 1]}
              formatter={(v) => formatSignedPercent(v)}
              footer={(p) => {
                const m = p[0]?.payload as MonthAverage | undefined;
                if (!m || !m.years) return null;
                return (
                  <div className="text-muted-foreground">
                    Positive in {formatPercent(m.positive, 0)} of {m.years} {m.years === 1 ? 'year' : 'years'}
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="average" radius={4} maxBarSize={24} isAnimationActive={!reducedMotion}>
          {data.map((d) => (
            <Cell key={d.month} fill={(d.average ?? 0) >= 0 ? 'var(--div-pos)' : 'var(--div-neg)'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export default function SeasonalityTab({ ticker, style }: TabProps) {
  const narrow = useMediaQuery('(max-width: 479px)');
  return (
    <div className="grid gap-4">
      <Panel
        title="Monthly returns"
        description="Each cell is the change from the previous month end. Blue months rose, red months fell."
        label={`${ticker.symbol} monthly returns heatmap`}
        summary={heatmapSummary(ticker)}
      >
        <Heatmap ticker={ticker} />
      </Panel>
      <Panel
        title="Average return by calendar month"
        description="Full months only, averaged over the years in the range."
        label={`${ticker.symbol} average return by month`}
        summary={ticker.seasonality.by_month.length ? byMonthSummary(ticker) : undefined}
      >
        <ByMonth ticker={ticker} style={style} narrow={narrow} />
      </Panel>
    </div>
  );
}
