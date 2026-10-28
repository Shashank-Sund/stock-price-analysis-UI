/**
 * The analysis dashboard, loaded on demand (React.lazy) so the first paint only
 * needs the form. Chart libraries load in their own chunks below this one.
 */
import { useMemo, useState } from 'react';
import type { AnalysisRequest } from '@/lib/api';
import { buildView } from '@/lib/dashboard';
import type { AnalysisResponse } from '@/lib/types';
import { AnalysisTabs } from './AnalysisTabs';
import { CsvActions } from './CsvActions';
import { PriceCard } from './PriceCard';
import { SummaryCards, SummaryTable } from './Summary';

export interface DashboardProps {
  data: AnalysisResponse;
  query: AnalysisRequest | null;
}

export default function Dashboard({ data, query }: DashboardProps) {
  const view = useMemo(() => buildView(data, query), [data, query]);
  const [selected, setSelected] = useState(view.tickers[0]);
  const active = view.tickers.includes(selected) ? selected : view.tickers[0];
  const ticker = data.series[active];
  const single = view.tickers.length === 1;
  const csv = <CsvActions data={data} view={view} active={active} />;

  return (
    <div className="flex flex-col gap-6">
      {single ? (
        <SummaryCards ticker={ticker} view={view} actions={csv} />
      ) : (
        <SummaryTable data={data} view={view} active={active} onSelect={setSelected} actions={csv} />
      )}
      <PriceCard ticker={ticker} view={view} interval={data.interval} onSelect={setSelected} />
      <AnalysisTabs data={data} view={view} active={active} onSelect={setSelected} />
    </div>
  );
}
