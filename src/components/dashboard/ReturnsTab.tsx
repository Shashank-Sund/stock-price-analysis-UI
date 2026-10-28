/** Returns tab: distribution of daily returns with an optional normal curve, and statistics. */
import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, colorVar, type ChartConfig } from '@/components/ui/chart';
import { useReducedMotion } from '@/hooks/useMedia';
import type { SeriesStyle } from '@/lib/dashboard';
import { formatInteger, formatPercent, formatRatio, formatSignedPercent } from '@/lib/format';
import { HINTS } from '@/lib/hints';
import { histogramBins, type HistogramBin } from '@/lib/transforms';
import { returnsSummary } from '@/lib/summaries';
import type { TickerData } from '@/lib/types';
import { Panel } from './Panel';
import { ToggleButton } from './parts';
import { yAxisBase } from './chart-axes';

export interface TabProps {
  ticker: TickerData;
  style: SeriesStyle;
}

const pct1 = (v: number) => formatSignedPercent(v, 1);


export default function ReturnsTab({ ticker, style }: TabProps) {
  const [normal, setNormal] = useState(false);
  const reducedMotion = useReducedMotion();
  const r = ticker.returns;
  const bins = useMemo(() => histogramBins(r.histogram, r.mean, r.std), [r]);
  const config: ChartConfig = {
    count: { label: 'Days', color: style.color },
    normal: { label: 'Normal curve', color: 'var(--chart-sma50)' },
  };
  const domain: [number, number] = bins.length ? [bins[0].lo, bins[bins.length - 1].hi] : [0, 1];

  const stats = [
    { label: 'Mean', value: formatSignedPercent(r.mean, 3), hint: HINTS.mean },
    { label: 'Median', value: formatSignedPercent(r.median, 3), hint: HINTS.median },
    { label: 'Standard deviation', value: formatPercent(r.std), hint: HINTS.std },
    { label: 'Skew', value: formatRatio(r.skew), hint: HINTS.skew },
    { label: 'Excess kurtosis', value: formatRatio(r.kurtosis), hint: HINTS.kurtosis },
    { label: '95% value at risk', value: formatSignedPercent(r.var_95), hint: HINTS.var95 },
    { label: 'Positive days', value: formatPercent(ticker.summary.positive_days, 1), hint: HINTS.positiveDays },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <Panel
        title="Distribution of daily returns"
        description={`${formatInteger(Math.max(0, ticker.summary.trading_days - 1))} trading days, from daily closes`}
        label={`Histogram of ${ticker.symbol} daily returns`}
        summary={returnsSummary(ticker)}
        actions={
          <ToggleButton pressed={normal} onClick={() => setNormal((v) => !v)} title="Bell curve with the same mean and standard deviation">
            <span aria-hidden="true" className="inline-block h-0 w-3 border-t-[1.5px] border-[var(--chart-sma50)]" />
            Normal curve
          </ToggleButton>
        }
      >
        {bins.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-muted-foreground">Not enough data for a histogram.</p>
        ) : (
          <ChartContainer config={config} className="h-[260px] sm:h-[360px]">
            <ComposedChart data={bins} margin={{ top: 16, right: 12, bottom: 0, left: 0 }} barCategoryGap={1}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="mid"
                type="number"
                domain={domain}
                tickFormatter={pct1}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickCount={7}
                minTickGap={8}
              />
              <YAxis {...yAxisBase} width={36} allowDecimals={false} />
              <ChartTooltip
                cursor={{ fillOpacity: 0.6 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_l, p) => {
                      const b = p[0]?.payload as HistogramBin | undefined;
                      return b ? `${formatSignedPercent(b.lo)} to ${formatSignedPercent(b.hi)}` : '';
                    }}
                    formatter={(v, key) => (key === 'normal' ? `${formatRatio(v, 1)} expected` : `${formatInteger(v)} days`)}
                  />
                }
              />
              <Bar
                dataKey="count"
                fill={colorVar('count')}
                fillOpacity={0.85}
                radius={[2, 2, 0, 0]}
                isAnimationActive={!reducedMotion}
                maxBarSize={24}
              />
              {normal && (
                <Line
                  dataKey="normal"
                  type="monotone"
                  stroke={colorVar('normal')}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              )}
              {r.var_95 !== null && (
                <ReferenceLine
                  x={r.var_95}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  label={{ value: '95% VaR', position: 'insideTopLeft', fill: 'var(--muted-foreground)', fontSize: 11, dy: -14 }}
                />
              )}
              <ReferenceLine x={0} strokeOpacity={0.5} />
            </ComposedChart>
          </ChartContainer>
        )}
      </Panel>
      <Card className="min-w-0 gap-0 overflow-hidden p-0">
        <div className="px-4 pt-4 pb-2 sm:px-5">
          <h4 className="text-sm font-semibold tracking-tight">Daily return statistics</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{ticker.symbol}, computed from daily closes</p>
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">{`${ticker.symbol} daily return statistics`}</caption>
          <tbody>
            {stats.map((s) => (
              <tr key={s.label} className="border-t align-top">
                <th scope="row" className="px-4 py-2.5 text-left font-normal sm:pl-5">
                  <span className="block font-medium">{s.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{s.hint}</span>
                </th>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums whitespace-nowrap sm:pr-5">{s.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
