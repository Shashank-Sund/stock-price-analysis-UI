import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildCsv, csvFilename } from '@/lib/csv';
import type { DashboardView } from '@/lib/dashboard';
import { downloadText } from '@/lib/download';
import type { AnalysisResponse } from '@/lib/types';

/** "Download CSV" for the selected ticker, and for every ticker plus SPY when there are several. */
export function CsvActions({ data, view, active }: { data: AnalysisResponse; view: DashboardView; active: string }) {
  const save = (symbols: string[]) => downloadText(csvFilename(symbols, data), buildCsv(data, symbols));
  const bar = data.interval === '1wk' ? 'weekly' : 'daily';
  const single = view.tickers.length === 1;
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Download data">
      <Button
        variant="outline"
        size="sm"
        onClick={() => save(single ? view.symbols : [active])}
        title={`Prices, volume, moving averages, ${bar} returns, drawdown and volatility${single && view.benchmark ? ', with SPY' : ''}`}
      >
        <Download />
        {single ? 'Download CSV' : `CSV: ${active}`}
      </Button>
      {!single && (
        <Button variant="outline" size="sm" onClick={() => save(view.symbols)} title="Every ticker and SPY in one file, one row per symbol and bar">
          <Download />
          CSV: all tickers
        </Button>
      )}
    </div>
  );
}
