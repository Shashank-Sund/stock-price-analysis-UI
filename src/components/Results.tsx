import { Suspense, type ReactNode } from 'react';
import { ChartLine, CircleAlert, RotateCcw, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { LazyDashboard } from '@/components/dashboard/lazy';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { AnalysisState } from '@/hooks/useAnalysis';
import type { AnalysisRequest } from '@/lib/api';
import { formatDisplayDate } from '@/lib/dates';

function rangeText(q: AnalysisRequest) {
  return `${formatDisplayDate(q.startDate)} to ${formatDisplayDate(q.endDate)}`;
}

function QuerySummary({ q, trailing }: { q: AnalysisRequest; trailing: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span aria-hidden="true" className="text-base font-semibold tracking-tight">
        Results
      </span>
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
  const { status, data, error, query, elapsed } = state;

  const announcement =
    status === 'loading'
      ? 'Analyzing, please wait.'
      : status === 'success' && data
        ? `Analysis ready for ${data.tickers.join(', ')}.`
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
          <p className="text-base font-medium">No analysis yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Choose a date range and up to 10 tickers, then select Analyze. Every ticker is compared with SPY, an S&amp;P 500
            fund.
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={onExample}>
            <Sparkles />
            Try AAPL over the last year
          </Button>
        </Card>
      )}

      {status === 'loading' && query && (
        <>
          <QuerySummary q={query} trailing={<>Working, {elapsed}s elapsed. This can take up to 30 seconds.</>} />
          <DashboardSkeleton tickers={query.tickers.length} />
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

      {status === 'success' && query && data && (
        <>
          <QuerySummary q={query} trailing={data.interval === '1wk' ? 'Weekly bars' : 'Daily bars'} />
          <ErrorBoundary resetKey={data}>
            <Suspense fallback={<DashboardSkeleton tickers={query.tickers.length} />}>
              <LazyDashboard data={data} query={query} />
            </Suspense>
          </ErrorBoundary>
        </>
      )}
    </section>
  );
}
