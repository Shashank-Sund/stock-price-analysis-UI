import type { FormEvent, ReactNode } from 'react';
import { ArrowRight, History, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { TickerInput } from '@/components/TickerInput';
import { cn } from '@/lib/utils';
import { PRESETS, formatDisplayDate, matchPreset, type PresetId } from '@/lib/dates';
import { recentKey, type RecentQuery } from '@/lib/recent';
import type { FormErrors } from '@/lib/validation';

export interface AnalyzeFormProps {
  startDate: string;
  endDate: string;
  tickers: string[];
  draft: string;
  errors: FormErrors;
  loading: boolean;
  elapsed: number;
  today: string;
  recent: RecentQuery[];
  onStartDate: (v: string) => void;
  onEndDate: (v: string) => void;
  onTickers: (v: string[]) => void;
  onDraft: (v: string) => void;
  onPreset: (id: PresetId) => void;
  onSubmit: () => void;
  onRecent: (q: RecentQuery) => void;
  onClearRecent: () => void;
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[13px] leading-snug text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function AnalyzeForm(props: AnalyzeFormProps) {
  const { startDate, endDate, tickers, draft, errors, loading, elapsed, today, recent } = props;
  const activePreset = matchPreset(startDate, endDate);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!loading) props.onSubmit();
  };

  return (
    <Card>
      <CardHeader className="pb-4 sm:pb-5">
        <CardTitle>New analysis</CardTitle>
        <CardDescription>
          Pick a date range and up to 10 tickers. You get a summary, an interactive price chart, return and risk
          statistics, seasonality and a comparison with SPY, an S&amp;P 500 fund used as the benchmark.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate aria-label="Analysis parameters">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-[10.5rem_10.5rem_minmax(0,1fr)_auto] lg:gap-x-4">
            <Field id="start-date" label="Start date" error={errors.startDate}>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                max={endDate || today}
                onChange={(e) => props.onStartDate(e.target.value)}
                aria-invalid={Boolean(errors.startDate) || undefined}
                aria-describedby={errors.startDate ? 'start-date-error' : undefined}
                required
              />
            </Field>
            <Field id="end-date" label="End date" error={errors.endDate}>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                max={today}
                onChange={(e) => props.onEndDate(e.target.value)}
                aria-invalid={Boolean(errors.endDate) || undefined}
                aria-describedby={errors.endDate ? 'end-date-error' : undefined}
                required
              />
            </Field>
            <Field id="tickers" label="Tickers" error={errors.tickers} className="col-span-2 lg:col-span-1">
              <TickerInput
                id="tickers"
                tickers={tickers}
                onChange={props.onTickers}
                draft={draft}
                onDraftChange={props.onDraft}
                invalid={Boolean(errors.tickers)}
                describedBy={errors.tickers ? 'tickers-error tickers-hint' : 'tickers-hint'}
              />
              <p id="tickers-hint" className="sr-only">
                Press Enter or comma to add a ticker. Backspace removes the last one.
              </p>
            </Field>
            <div className="col-span-2 flex flex-col gap-2 lg:col-span-1">
              <span aria-hidden="true" className="hidden text-sm leading-none lg:block">
                &nbsp;
              </span>
              <Button type="submit" disabled={loading} className="w-full min-w-[9.5rem] lg:w-auto">
                {loading ? (
                  <>
                    <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
                    <span>Analyzing</span>
                    <span className="tabular-nums text-primary-foreground/80">{elapsed}s</span>
                  </>
                ) : (
                  <>
                    <span>Analyze</span>
                    <ArrowRight aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] text-muted-foreground" id="preset-label">
              Quick range
            </span>
            <div role="group" aria-labelledby="preset-label" className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const active = activePreset === p.id;
                return (
                  <Button
                    key={p.id}
                    size="sm"
                    variant="outline"
                    aria-pressed={active}
                    title={p.description}
                    onClick={() => props.onPreset(p.id)}
                    className={cn(
                      'h-7 min-w-11 px-2.5 font-medium tabular-nums',
                      active &&
                        'border-primary/40 bg-accent text-accent-foreground hover:bg-accent dark:border-primary/50 dark:bg-accent',
                    )}
                  >
                    {p.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </form>

        {recent.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="mr-1 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <History className="size-3.5" aria-hidden="true" />
              Recent
            </span>
            <ul className="flex min-w-0 max-w-full flex-wrap gap-1.5" aria-label="Recent searches">
              {recent.map((q) => (
                <li key={recentKey(q)} className="min-w-0 max-w-full">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    onClick={() => props.onRecent(q)}
                    className="h-7 max-w-full rounded-full px-3"
                    aria-label={`Rerun ${q.tickers.join(', ')} from ${formatDisplayDate(q.startDate)} to ${formatDisplayDate(q.endDate)}`}
                  >
                    <span className="min-w-0 truncate font-mono text-xs font-semibold">{q.tickers.join(', ')}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDisplayDate(q.startDate)} to {formatDisplayDate(q.endDate)}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={props.onClearRecent}>
              Clear
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
