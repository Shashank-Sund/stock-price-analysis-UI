/**
 * Detail tabs under the price chart. Each tab's chart code is its own lazy chunk
 * (Recharts loads with the first one opened). Returns, Risk and Seasonality follow
 * the same ticker as the price chart.
 */
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DashboardView } from '@/lib/dashboard';
import type { AnalysisResponse } from '@/lib/types';
import { TickerSwitcher } from './TickerSwitcher';

const ReturnsTab = lazy(() => import('./ReturnsTab'));
const RiskTab = lazy(() => import('./RiskTab'));
const SeasonalityTab = lazy(() => import('./SeasonalityTab'));

export type TabId = 'returns' | 'risk' | 'seasonality';

const TABS: { id: TabId; label: string; perTicker: boolean }[] = [
  { id: 'returns', label: 'Returns', perTicker: true },
  { id: 'risk', label: 'Risk', perTicker: true },
  { id: 'seasonality', label: 'Seasonality', perTicker: true },
];

function Loading() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
      <Skeleton className="h-[340px] rounded-xl" />
      <Skeleton className="h-[340px] rounded-xl" />
    </div>
  );
}

export function AnalysisTabs({
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
  const [tab, setTab] = useState<TabId>('returns');
  const ticker = data.series[active];
  const style = view.styles[active];
  const current = TABS.find((t) => t.id === tab)!;

  const panel = (id: TabId, node: ReactNode) => (
    <TabsContent value={id} className="mt-4">
      <Suspense fallback={<Loading />}>{node}</Suspense>
    </TabsContent>
  );

  return (
    <section aria-labelledby="details-heading" className="flex flex-col">
      <h3 id="details-heading" className="sr-only">
        Details for {current.perTicker ? active : 'all tickers'}
      </h3>
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="Analysis details">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {current.perTicker && <TickerSwitcher view={view} active={active} onChange={onSelect} label="Ticker shown in this tab" />}
        </div>
        {panel('returns', <ReturnsTab ticker={ticker} style={style} />)}
        {panel('risk', <RiskTab ticker={ticker} style={style} interval={data.interval} />)}
        {panel('seasonality', <SeasonalityTab ticker={ticker} style={style} />)}
      </Tabs>
    </section>
  );
}
