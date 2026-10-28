/**
 * Compare tab: % change since the start for every ticker plus SPY, the correlation
 * matrix of daily returns, and risk versus return. With one ticker it compares it with SPY.
 */
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { ChartContainer, ChartLegend, ChartTooltip, ChartTooltipContent, colorVar, type ChartConfig } from '@/components/ui/chart';
import { InfoHint } from '@/components/ui/info-hint';
import { useMediaQuery, useReducedMotion } from '@/hooks/useMedia';
import type { DashboardView } from '@/lib/dashboard';
import { formatDate, formatPercent, formatRatio, formatSignedPercent, formatTickPercent } from '@/lib/format';
import { HINTS } from '@/lib/hints';
import { correlationSummary, cumulativeSummary, riskReturnSummary } from '@/lib/summaries';
import { compareRows, correlationGrid, divergingColor, logGrowthTicks, niceTicks, placeLabels, type TimePoint } from '@/lib/transforms';
import { cn } from '@/lib/utils';
import type { AnalysisResponse, RiskReturnPoint } from '@/lib/types';
import { Panel } from './Panel';
import { ToggleButton } from './parts';
import { timeAxis, yAxisBase } from './chart-axes';

interface CompareProps {
  data: AnalysisResponse;
  view: DashboardView;
}

function useConfig(view: DashboardView): ChartConfig {
  return useMemo(() => {
    const c: ChartConfig = {};
    for (const s of view.symbols) {
      const st = view.styles[s];
      c[s] = { label: st.benchmark ? `${s} (benchmark)` : s, color: st.color, dashed: st.dashed };
    }
    return c;
  }, [view]);
}

function CumulativeChart({ data, view }: CompareProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Start on a log axis when one line would flatten the rest (a gain of more than 300%).
  const [log, setLog] = useState(() =>
    view.symbols.some((s) => Math.max(...(data.compare.cumulative_return.values[s] ?? []).map((v) => v ?? 0)) > 3),
  );
  const reducedMotion = useReducedMotion();
  const config = useConfig(view);
  const rows = useMemo(() => compareRows(data.compare, view.symbols, log), [data, view, log]);
  const x = timeAxis(rows);
  const logTicks = useMemo(() => {
    if (!log) return undefined;
    const vals = rows.flatMap((r) => view.symbols.map((k) => r[k])).filter((v): v is number => typeof v === 'number' && v > 0);
    return logGrowthTicks(Math.min(...vals), Math.max(...vals));
  }, [log, rows, view]);
  const weekly = data.interval === '1wk';
  const toggle = (k: string) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const asReturn = (v: number | null) => (v === null ? null : log ? v - 1 : v);

  return (
    <Panel
      title="Change since the start"
      description={`Percent change from each symbol's first close in the range${weekly ? ', weekly bars' : ''}. SPY is the dashed gray line.`}
      label="Percent change since the start, all symbols"
      summary={cumulativeSummary(data, view.symbols, view.benchmarkAvailable ? data.benchmark : null)}
      actions={
        <ToggleButton pressed={log} onClick={() => setLog((v) => !v)} title="Logarithmic axis: equal distances mean equal percentage moves">
          Log scale
        </ToggleButton>
      }
    >
      <ChartContainer config={config} className="h-[280px] sm:h-[340px]">
        <LineChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis {...x} />
          <YAxis
            {...yAxisBase}
            width={56}
            scale={log ? 'log' : 'auto'}
            domain={log && logTicks ? [logTicks[0], logTicks[logTicks.length - 1]] : ['auto', 'auto']}
            ticks={logTicks}
            allowDataOverflow={log}
            tickFormatter={(v: number) => formatTickPercent(asReturn(v) ?? 0)}
          />
          <ReferenceLine y={log ? 1 : 0} strokeOpacity={0.6} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                sort
                labelFormatter={(_l, p) => {
                  const r = p[0]?.payload as TimePoint | undefined;
                  return r ? `${weekly ? 'Week ending ' : ''}${formatDate(r.date)}` : '';
                }}
                formatter={(v) => formatSignedPercent(asReturn(v ?? null), 1)}
              />
            }
          />
          {view.symbols.map((s) => {
            const st = view.styles[s];
            return (
              <Line
                key={s}
                dataKey={s}
                hide={hidden.has(s)}
                type="linear"
                stroke={colorVar(s)}
                strokeWidth={st.benchmark ? 1.5 : 2}
                strokeDasharray={st.benchmark ? '5 4' : st.dashed ? '8 3' : undefined}
                strokeOpacity={st.benchmark ? 0.9 : 1}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={!reducedMotion && rows.length < 600}
              />
            );
          })}
        </LineChart>
      </ChartContainer>
      <div className="px-2">
        <ChartLegend config={config} keys={view.symbols} hidden={hidden} onToggle={toggle} />
        <p className="mt-1.5 text-[11px] text-muted-foreground">Select a name to hide or show its line.</p>
      </div>
    </Panel>
  );
}


function CorrelationMatrix({ data, view }: CompareProps) {
  const grid = useMemo(() => correlationGrid(data.compare, view.symbols), [data, view]);
  const cell = 'h-10 min-w-[3.25rem] px-1 text-center text-xs font-medium tabular-nums';
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-1">
          Correlation of daily returns
          <InfoHint label="correlation">{HINTS.correlation}</InfoHint>
        </span>
      }
      description="1 means the two always moved together; 0 means no relationship."
      label="Correlation matrix of daily returns"
      summary={correlationSummary(grid)}
    >
      {grid.symbols.length < 2 ? (
        <p className="px-2 py-10 text-center text-sm text-muted-foreground">Add another ticker to see correlations.</p>
      ) : (
        <div className="overflow-x-auto px-2 pb-1">
          <table className="mx-auto border-separate border-spacing-[3px] text-xs">
            <caption className="sr-only">Correlation of daily returns between each pair of symbols</caption>
            <thead>
              <tr>
                <td />
                {grid.symbols.map((s) => (
                  <th key={s} scope="col" className="px-1 pb-1 font-mono font-medium whitespace-nowrap text-muted-foreground">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row, i) => (
                <tr key={grid.symbols[i]}>
                  <th scope="row" className="sticky left-0 z-[1] bg-card pr-2 text-right font-mono font-medium whitespace-nowrap text-muted-foreground">
                    {grid.symbols[i]}
                  </th>
                  {row.map((c) => {
                    const { background, strong } = divergingColor(c.value, 1);
                    return (
                      <td
                        key={c.col}
                        className={cn(cell, 'rounded-[4px]', strong ? 'text-white' : 'text-foreground')}
                        style={{ background }}
                        title={`${c.row} and ${c.col}: ${formatRatio(c.value)}`}
                      >
                        {formatRatio(c.value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">-1</span>
            <span
              aria-hidden="true"
              className="h-2.5 w-28 rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--div-neg), var(--div-mid), var(--div-pos))' }}
            />
            <span className="tabular-nums">+1</span>
          </div>
        </div>
      )}
    </Panel>
  );
}

function ScatterTip({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) {
  const p = payload?.[0]?.payload as (RiskReturnPoint & { label: string }) | undefined;
  if (!active || !p) return null;
  return (
    <div className="grid min-w-40 gap-1 rounded-lg border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-md backdrop-blur-sm">
      <div className="font-mono font-medium">{p.label}</div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">Annual return</span>
        <span className="tabular-nums">{formatSignedPercent(p.annual_return)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">Annual volatility</span>
        <span className="tabular-nums">{formatPercent(p.annual_volatility)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">Sharpe (risk-free 0%)</span>
        <span className="tabular-nums">{formatRatio(p.sharpe)}</span>
      </div>
    </div>
  );
}

function RiskReturn({ data, view }: CompareProps) {
  const reducedMotion = useReducedMotion();
  const narrow = useMediaQuery('(max-width: 479px)');
  const config = useConfig(view);
  const points = useMemo(
    () =>
      view.symbols
        .map((s) => data.compare.risk_return.find((p) => p.symbol === s))
        .filter((p): p is RiskReturnPoint => Boolean(p && p.annual_return !== null && p.annual_volatility !== null))
        .map((p) => ({ ...p, label: p.symbol })),
    [data, view],
  );
  const xs = points.map((p) => p.annual_volatility as number);
  const ys = points.map((p) => p.annual_return as number);
  const xTicks = niceTicks(0, Math.max(0.05, ...xs) * 1.08, narrow ? 4 : 5);
  const yTicks = niceTicks(Math.min(0, ...ys), Math.max(0, ...ys) * 1.05 + 0.01, 5);
  const xDomain: [number, number] = [xTicks[0], xTicks[xTicks.length - 1]];
  const yDomain: [number, number] = [yTicks[0], yTicks[yTicks.length - 1]];
  const plot = { width: narrow ? 270 : 520, height: 250 };
  const sides = placeLabels(
    points.map((p) => ({ x: p.annual_volatility as number, y: p.annual_return as number, width: p.symbol.length * 7 + 2 })),
    plot,
    { x: xDomain, y: yDomain },
  );
  return (
    <Panel
      title="Risk versus return"
      description="Up is a higher annual return, right is a bumpier ride. Up and to the left is best."
      label="Scatter plot of annual volatility against annual return"
      summary={riskReturnSummary(points)}
    >
      <ChartContainer config={config} className="h-[300px] sm:h-[340px]">
        <ScatterChart margin={{ top: 24, right: 28, bottom: 16, left: 4 }}>
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="annual_volatility"
            name="Annual volatility"
            tickFormatter={formatTickPercent}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={xDomain}
            ticks={xTicks}
            label={{ value: 'Annual volatility', position: 'insideBottom', offset: -12, fill: 'var(--muted-foreground)', fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="annual_return"
            name="Annual return"
            {...yAxisBase}
            width={56}
            tickFormatter={formatTickPercent}
            domain={yDomain}
            ticks={yTicks}
            label={{ value: 'Annual return', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--muted-foreground)', fontSize: 11, dy: 40 }}
          />
          <ZAxis range={[90, 90]} />
          <ReferenceLine y={0} strokeOpacity={0.6} />
          <ChartTooltip cursor={false} content={<ScatterTip />} />
          {points.map((p, i) => {
            const st = view.styles[p.symbol];
            return (
              <Scatter
                key={p.symbol}
                name={p.symbol}
                data={[p]}
                fill={st.benchmark ? 'var(--card)' : colorVar(p.symbol)}
                stroke={st.benchmark ? colorVar(p.symbol) : 'var(--card)'}
                strokeWidth={2}
                isAnimationActive={!reducedMotion}
              >
                <LabelList dataKey="label" position={sides[i]} offset={8} fill="var(--foreground)" fontSize={11} className="font-mono" />
              </Scatter>
            );
          })}
        </ScatterChart>
      </ChartContainer>
    </Panel>
  );
}

export default function CompareTab({ data, view }: CompareProps) {
  return (
    <div className="grid gap-4">
      <CumulativeChart data={data} view={view} />
      <div className={cn('grid gap-4', view.symbols.length <= 6 && 'xl:grid-cols-2')}>
        <CorrelationMatrix data={data} view={view} />
        <RiskReturn data={data} view={view} />
      </div>
    </div>
  );
}
