import { useState, type ReactNode } from 'react';
import { ChartLine, CircleAlert, RotateCcw, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartCard, ChartCardSkeleton } from '@/components/ChartCard';
import { ChartDialog } from '@/components/ChartDialog';
import type { AnalysisState } from '@/hooks/useAnalysis';
import type { AnalysisRequest } from '@/lib/api';
import { formatDisplayDate } from '@/lib/dates';
import { expectedChartCount, isWide } from '@/lib/layout';
import { chartFilename, downloadDataUrl } from '@/lib/download';
import type { Chart } from '@/lib/parse';

function rangeText(q: AnalysisRequest) {
  return `${formatDisplayDate(q.startDate)} to ${formatDisplayDate(q.endDate)}`;
}

function QuerySummary({ q, trailing }: { q: AnalysisRequest; trailing: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span aria-hidden="true" className="text-base font-semibold tracking-tight">Results</span>
      <div className="flex flex-wrap gap-1">
        {q.tickers.map((t) => (
          <Badge key={t} variant="secondary" className="font-mono">
            {t}
          </Badge>
        ))}
      </div>
      <span className="text-sm text-muted-foreground tabular-nums">{rangeText(q)}</span>
      <span className="w-full text-sm text-muted-foreground tabular-nums sm:ml-auto sm:w-auto">{trailing}</span>
    </div>
  );
}

interface ResultsProps {
  state: AnalysisState;
  onRetry: () => void;
  onExample: () => void;
}

export function Results({ state, onRetry, onExample }: ResultsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { status, charts, error, query, elapsed } = state;

  const download = (chart: Chart) => downloadDataUrl(chart.src, chartFilename(query?.tickers ?? [], chart.title));

  const announcement =
    status === 'loading'
      ? 'Analyzing, please wait.'
      : status === 'success'
        ? `${charts.length} ${charts.length === 1 ? 'chart' : 'charts'} ready.`
        : status === 'error'
          ? `Analysis failed. ${error ?? ''}`
          : '';

  return (
    <section aria-labelledby="results-heading" aria-busy={status === 'loading'} className="flex flex-col gap-4">
      <h2 id="results-heading" className="sr-only">
        Results
      </h2>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {status === 'idle' && (
        <Card className="animate-fade items-center border-dashed px-6 py-12 text-center shadow-none sm:py-16">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <ChartLine className="size-6" aria-hidden="true" />
          </div>
          <p className="text-base font-medium">No charts yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Choose a date range and one or more tickers, then select Analyze. Charts appear here.
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={onExample}>
            <Sparkles />
            Try AAPL over the last year
          </Button>
        </Card>
      )}

      {status === 'loading' && query && (
        <>
          <QuerySummary
            q={query}
            trailing={<>Working, {elapsed}s elapsed. This can take up to 30 seconds.</>}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="chart-skeletons">
            {Array.from({ length: expectedChartCount(query) }, (_, i) => (
              <ChartCardSkeleton key={i} wide={isWide(i, expectedChartCount(query))} />
            ))}
          </div>
        </>
      )}

      {status === 'error' && (
        <Alert variant="destructive" className="animate-fade">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>
            <p className="text-foreground/85">{error}</p>
            {query && (
              <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
                <RotateCcw />
                Try again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {status === 'success' && query && (
        <>
          <QuerySummary
            q={query}
            trailing={`${charts.length} ${charts.length === 1 ? 'chart' : 'charts'}`}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {charts.map((c, i) => (
              <ChartCard
                key={`${i}-${c.title}`}
                chart={c}
                index={i}
                wide={isWide(i, charts.length)}
                onOpen={() => setOpenIndex(i)}
                onDownload={() => download(c)}
              />
            ))}
          </div>
          <ChartDialog
            charts={charts}
            index={openIndex}
            onIndexChange={setOpenIndex}
            subtitle={`${query.tickers.join(', ')}, ${rangeText(query)}`}
            onDownload={download}
          />
        </>
      )}
    </section>
  );
}
