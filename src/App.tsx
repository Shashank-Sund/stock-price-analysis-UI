import { useCallback, useMemo, useState } from 'react';
import { AnalyzeForm } from '@/components/AnalyzeForm';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Results } from '@/components/Results';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useTheme } from '@/hooks/useTheme';
import type { AnalysisRequest } from '@/lib/api';
import { presetRange, toISODate, type PresetId } from '@/lib/dates';
import { clearRecent, loadRecent, pushRecent, type RecentQuery } from '@/lib/recent';
import { addTickers, splitTickers } from '@/lib/tickers';
import { hasErrors, validateForm, type FormErrors } from '@/lib/validation';

export default function App() {
  const { theme, toggle } = useTheme();
  const today = useMemo(() => toISODate(new Date()), []);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tickers, setTickers] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [recent, setRecent] = useState<RecentQuery[]>(() => loadRecent());

  const onSuccess = useCallback((q: AnalysisRequest) => setRecent((list) => pushRecent(list, q)), []);
  const { state, run } = useAnalysis(onSuccess);
  const loading = state.status === 'loading';

  const clearError = (field: keyof FormErrors) =>
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

  const submit = (values: AnalysisRequest) => {
    const found = validateForm(values);
    setErrors(found);
    if (hasErrors(found)) return;
    void run(values);
  };

  const onSubmit = () => {
    // Include whatever is still typed in the ticker box.
    const all = draft.trim() ? addTickers(tickers, splitTickers(draft)) : tickers;
    if (all !== tickers) {
      setTickers(all);
      setDraft('');
    }
    submit({ startDate, endDate, tickers: all });
  };

  const fill = (q: RecentQuery) => {
    setStartDate(q.startDate);
    setEndDate(q.endDate);
    setTickers(q.tickers);
    setDraft('');
    submit(q);
  };

  const onPreset = (id: PresetId) => {
    const r = presetRange(id);
    setStartDate(r.startDate);
    setEndDate(r.endDate);
    setErrors((e) => ({ ...e, startDate: undefined, endDate: undefined }));
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Header theme={theme} onToggleTheme={toggle} />
        <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <AnalyzeForm
            startDate={startDate}
            endDate={endDate}
            tickers={tickers}
            draft={draft}
            errors={errors}
            loading={loading}
            elapsed={state.elapsed}
            today={today}
            recent={recent}
            onStartDate={(v) => {
              setStartDate(v);
              clearError('startDate');
            }}
            onEndDate={(v) => {
              setEndDate(v);
              clearError('endDate');
            }}
            onTickers={(v) => {
              setTickers(v);
              clearError('tickers');
            }}
            onDraft={setDraft}
            onPreset={onPreset}
            onSubmit={onSubmit}
            onRecent={fill}
            onClearRecent={() => setRecent(clearRecent())}
          />
          <Results
            state={state}
            onRetry={() => state.query && submit(state.query)}
            onExample={() => fill({ ...presetRange('1Y'), tickers: ['AAPL'] })}
          />
        </main>
        <Footer />
      </div>
    </TooltipProvider>
  );
}
