import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, type AnalysisRequest } from '@/lib/api';
import { fetchAnalysis } from '@/lib/analysis-api';
import type { AnalysisResponse } from '@/lib/types';
import { loadDashboard } from '@/components/dashboard/lazy';

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AnalysisState {
  status: AnalysisStatus;
  data: AnalysisResponse | null;
  error: string | null;
  /** The query currently running, or the one that produced the shown result. */
  query: AnalysisRequest | null;
  elapsed: number;
}

const initial: AnalysisState = { status: 'idle', data: null, error: null, query: null, elapsed: 0 };

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

    setState({ status: 'loading', data: null, error: null, query, elapsed: 0 });
    // Fetch the dashboard code while the API works.
    void loadDashboard().catch(() => {});
    const tick = setInterval(() => {
      if (requestId.current !== id) return;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setState((s) => (s.elapsed === elapsed ? s : { ...s, elapsed }));
    }, 250);

    try {
      const data = await fetchAnalysis(query, { signal: ctrl.signal });
      if (requestId.current !== id) return;
      setState({ status: 'success', data, error: null, query, elapsed: 0 });
      onSuccessRef.current?.(query);
    } catch (err) {
      if (requestId.current !== id) return;
      if (err instanceof ApiError && err.kind === 'aborted') return;
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setState({ status: 'error', data: null, error: message, query, elapsed: 0 });
    } finally {
      clearInterval(tick);
    }
  }, []);

  return { state, run };
}
