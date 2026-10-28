/** Risk tab: rolling 30 day volatility, and the drawdown (underwater) chart with the worst drawdown highlighted. */
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, colorVar, type ChartConfig } from '@/components/ui/chart';
import { useReducedMotion } from '@/hooks/useMedia';
import { dateToMs, formatDate, formatPercent, formatSignedPercent } from '@/lib/format';
import { HINTS } from '@/lib/hints';
import { timeRows, type TimePoint } from '@/lib/transforms';
import { drawdownSummary, volatilitySummary } from '@/lib/summaries';
import type { Interval } from '@/lib/types';
import { Panel } from './Panel';
import { timeAxis, yAxisBase } from './chart-axes';
import type { TabProps } from './ReturnsTab';



const tooltipDate = (interval: Interval) => (_l: unknown, p: readonly { payload?: unknown }[]) => {
  const row = p[0]?.payload as TimePoint | undefined;
  return row ? `${interval === '1wk' ? 'Week ending ' : ''}${formatDate(row.date)}` : '';
};

export default function RiskTab({ ticker, style, interval }: TabProps & { interval: Interval }) {
  const reducedMotion = useReducedMotion();
  const rows = useMemo(
    () => timeRows(ticker.prices.date, { vol: ticker.risk.rolling_volatility, dd: ticker.risk.drawdown }),
    [ticker],
  );
  const config: ChartConfig = {
    vol: { label: '30 day volatility', color: style.color },
    dd: { label: 'Below high', color: style.color },
  };
  const s = ticker.summary;
  const peak = s.max_drawdown_peak ? dateToMs(s.max_drawdown_peak) : null;
  const trough = s.max_drawdown_trough ? dateToMs(s.max_drawdown_trough) : null;
  const hasVol = rows.some((r) => r.vol !== null);
  const x = timeAxis(rows);
  // Small drawdowns need a decimal on the axis so ticks do not repeat.
  const ddDigits = (s.max_drawdown ?? 0) > -0.1 ? 1 : 0;
  const tip = tooltipDate(interval);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel
        title="Rolling 30 day volatility"
        description={HINTS.rollingVol}
        label={`${ticker.symbol} rolling 30 day volatility`}
        summary={volatilitySummary(ticker)}
        actions={
          s.annual_volatility !== null && hasVol ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden="true" className="inline-block h-0 w-3.5 border-t-[1.5px] border-dashed border-[var(--chart-axis)]" />
              Whole range {formatPercent(s.annual_volatility, 1)}
            </span>
          ) : undefined
        }
      >
        {!hasVol ? (
          <p className="px-2 py-10 text-center text-sm text-muted-foreground">Not enough history for a 30 day volatility.</p>
        ) : (
          <ChartContainer config={config} className="h-[240px] sm:h-[280px]">
            <AreaChart data={rows} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="vol-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colorVar('vol')} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={colorVar('vol')} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis {...x} />
              <YAxis {...yAxisBase} width={44} tickFormatter={(v: number) => formatPercent(v, 0)} domain={[0, 'auto']} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={tip} formatter={(v) => formatPercent(v, 1)} />} />
              {s.annual_volatility !== null && (
                <ReferenceLine y={s.annual_volatility} strokeOpacity={0.7} strokeDasharray="4 3" />
              )}
              <Area
                dataKey="vol"
                type="monotone"
                stroke={colorVar('vol')}
                strokeWidth={2}
                fill="url(#vol-fill)"
                connectNulls={false}
                isAnimationActive={!reducedMotion}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </Panel>
      <Panel
        title="Drawdown"
        description={HINTS.drawdown}
        label={`${ticker.symbol} drawdown chart`}
        summary={drawdownSummary(ticker)}
        actions={
          peak !== null ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden="true" className="inline-block size-3 rounded-sm bg-[var(--chart-highlight)] ring-1 ring-[var(--negative)]/30" />
              Max drawdown {formatSignedPercent(s.max_drawdown, 1)}
            </span>
          ) : undefined
        }
      >
        <ChartContainer config={config} className="h-[240px] sm:h-[280px]">
          <AreaChart data={rows} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="dd-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorVar('dd')} stopOpacity={0.04} />
                <stop offset="100%" stopColor={colorVar('dd')} stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis {...x} />
            <YAxis {...yAxisBase} width={48} tickFormatter={(v: number) => formatPercent(v, ddDigits)} domain={['auto', 0]} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={tip} formatter={(v) => formatSignedPercent(v)} />} />
            {peak !== null && trough !== null && (
              <ReferenceArea
                x1={peak}
                x2={Math.max(trough, peak + 86400000)}
                fill="var(--chart-highlight)"
                fillOpacity={1}
                strokeOpacity={0}
                ifOverflow="extendDomain"
              />
            )}
            <Area
              dataKey="dd"
              type="linear"
              baseValue={0}
              stroke={colorVar('dd')}
              strokeWidth={2}
              fill="url(#dd-fill)"
              isAnimationActive={!reducedMotion}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ChartContainer>
      </Panel>
    </div>
  );
}
