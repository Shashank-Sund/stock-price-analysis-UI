import { useCallback, useEffect, useRef, useState } from 'react';
import { analyze, ApiError, type AnalysisRequest } from '@/lib/api';
import type { Chart } from '@/lib/parse';

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AnalysisState {
  status: AnalysisStatus;
  charts: Chart[];
  error: string | null;
  /** The query currently running, or the one that produced the shown result. */
  query: AnalysisRequest | null;
  elapsed: number;
}

const initial: AnalysisState = { status: 'idle', charts: [], error: null, query: null, elapsed: 0 };

export function useAnalysis(onSuccess?: (q: AnalysisRequest) => void) {
  const [state, setState] = useState<AnalysisState>(initial);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async (query: AnalysisRequest) => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    const id = ++requestId.current;
    const startedAt = Date.now();

    setState({ status: 'loading', charts: [], error: null, query, elapsed: 0 });
    const tick = setInterval(() => {
      if (requestId.current !== id) return;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setState((s) => (s.elapsed === elapsed ? s : { ...s, elapsed }));
    }, 250);

    try {
      const charts = await analyze(query, { signal: ctrl.signal });
      if (requestId.current !== id) return;
      setState({ status: 'success', charts, error: null, query, elapsed: 0 });
      onSuccessRef.current?.(query);
    } catch (err) {
      if (requestId.current !== id) return;
      if (err instanceof ApiError && err.kind === 'aborted') return;
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setState({ status: 'error', charts: [], error: message, query, elapsed: 0 });
    } finally {
      clearInterval(tick);
    }
  }, []);

  return { state, run };
}
