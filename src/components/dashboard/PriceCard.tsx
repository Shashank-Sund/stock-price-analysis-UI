import { lazy, Suspense, useId, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WithTooltip } from '@/components/ui/tooltip';
import type { DashboardView } from '@/lib/dashboard';
import { priceSummary } from '@/lib/summaries';
import type { Interval, TickerData } from '@/lib/types';
import type { PriceChartHandle, PriceMode } from './PriceChart';
import { SeriesKey, ToggleButton } from './parts';
import { TickerSwitcher } from './TickerSwitcher';

const PriceChart = lazy(() => import('./PriceChart'));

export const PRICE_CHART_HEIGHT = 'h-[320px] sm:h-[400px]';

export function IntervalNote({ interval }: { interval: Interval }) {
  if (interval !== '1wk') return null;
  return (
    <span className="rounded-md border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground" title="Ranges longer than 5 years are charted with one bar per week">
      Weekly bars
    </span>
  );
}

export function PriceCard({
  ticker,
  view,
  interval,
  onSelect,
}: {
  ticker: TickerData;
  view: DashboardView;
  interval: Interval;
  onSelect: (t: string) => void;
}) {
  const [mode, setMode] = useState<PriceMode>('line');
  const [sma50, setSma50] = useState(false);
  const [sma200, setSma200] = useState(false);
  const [log, setLog] = useState(false);
  const chart = useRef<PriceChartHandle>(null);
  const captionId = useId();
  const style = view.styles[ticker.symbol];

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-2">
            <SeriesKey style={style} />
            <h3 className="text-base font-semibold tracking-tight">
              <span className="font-mono">{ticker.symbol}</span> price
            </h3>
            <IntervalNote interval={interval} />
          </div>
          <TickerSwitcher view={view} active={ticker.symbol} onChange={onSelect} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Chart type" className="flex gap-1">
            <ToggleButton pressed={mode === 'line'} onClick={() => setMode('line')}>
              Line
            </ToggleButton>
            <ToggleButton pressed={mode === 'candles'} onClick={() => setMode('candles')}>
              Candlesticks
            </ToggleButton>
          </div>
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          <div role="group" aria-label="Moving averages" className="flex gap-1">
            <ToggleButton pressed={sma50} onClick={() => setSma50((v) => !v)} title="50 trading day simple moving average">
              <span aria-hidden="true" className="inline-block h-0 w-3 border-t-[1.5px] border-[var(--chart-sma50)]" />
              50 day avg
            </ToggleButton>
            <ToggleButton pressed={sma200} onClick={() => setSma200((v) => !v)} title="200 trading day simple moving average">
              <span aria-hidden="true" className="inline-block h-0 w-3 border-t-[1.5px] border-dashed border-[var(--chart-sma200)]" />
              200 day avg
            </ToggleButton>
          </div>
          <ToggleButton pressed={log} onClick={() => setLog((v) => !v)} title="Logarithmic price axis: equal distances mean equal percentage moves">
            Log scale
          </ToggleButton>
          <WithTooltip label="Reset zoom">
            <Button variant="ghost" size="icon-sm" className="ml-auto size-7" onClick={() => chart.current?.resetZoom()} aria-label="Reset zoom">
              <RotateCcw />
            </Button>
          </WithTooltip>
        </div>
      </div>
      <figure className="m-0 px-2 pt-3 pb-2 sm:px-3" aria-label={`${ticker.symbol} price chart`} aria-describedby={captionId}>
        <div className={PRICE_CHART_HEIGHT}>
          <Suspense fallback={<Skeleton className="size-full rounded-lg" />}>
            <PriceChart
              ref={chart}
              series={ticker}
              style={style}
              interval={interval}
              mode={mode}
              showSma50={sma50}
              showSma200={sma200}
              logScale={log}
            />
          </Suspense>
        </div>
        <figcaption id={captionId} className="px-2 pt-2 text-xs leading-relaxed text-muted-foreground">
          {priceSummary(ticker)} {interval === '1wk' ? 'One bar per week; the lower pane shows weekly volume.' : 'The lower pane shows daily volume.'}{' '}
          <span className="hidden sm:inline">Drag to pan, scroll to zoom.</span>
          <span className="sm:hidden">Swipe to pan, pinch to zoom.</span>
        </figcaption>
      </figure>
    </Card>
  );
}
