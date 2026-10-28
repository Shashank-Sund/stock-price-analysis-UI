import { messageFromJson, parseAnalysisResponse, type Chart } from './parse';

export const DEFAULT_API_URL = 'https://mgpqvaaqhh.execute-api.us-east-1.amazonaws.com/Prod';
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || DEFAULT_API_URL;

/** API Gateway gives up at 29 s; we wait a little longer so its own error can arrive first. */
export const REQUEST_TIMEOUT_MS = 35_000;

export interface AnalysisRequest {
  startDate: string;
  endDate: string;
  tickers: string[];
}

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'server' | 'aborted';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

export interface AnalyzeOptions {
  url?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export function toRequestBody(req: AnalysisRequest) {
  return { start_date: req.startDate, end_date: req.endDate, symbol: req.tickers.join(',') };
}

export async function analyze(req: AnalysisRequest, opts: AnalyzeOptions = {}): Promise<Chart[]> {
  const { url = API_URL, signal, timeoutMs = REQUEST_TIMEOUT_MS, fetchImpl = fetch } = opts;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toRequestBody(req)),
        signal: controller.signal,
      });
    } catch {
      throw abortOrNetworkError(timedOut, Boolean(signal?.aborted), timeoutMs);
    }

    let text: string;
    try {
      text = await res.text();
    } catch {
      throw abortOrNetworkError(timedOut, Boolean(signal?.aborted), timeoutMs);
    }

    if (!res.ok) {
      let detail: string | null = null;
      try {
        detail = messageFromJson(JSON.parse(text));
      } catch {
        const parsed = parseAnalysisResponse(text);
        detail = parsed.kind === 'error' && text.includes('eda-error') ? parsed.message : null;
      }
      throw new ApiError(
        'http',
        detail ?? `The analysis service returned HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}. Please try again.`,
      );
    }

    const parsed = parseAnalysisResponse(text);
    if (parsed.kind === 'error') throw new ApiError('server', parsed.message);
    return parsed.charts;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

function abortOrNetworkError(timedOut: boolean, cancelled: boolean, timeoutMs: number): ApiError {
  if (cancelled && !timedOut) return new ApiError('aborted', 'The request was cancelled.');
  if (timedOut) {
    return new ApiError(
      'timeout',
      `The request timed out after ${Math.round(timeoutMs / 1000)} seconds. Try a shorter date range or fewer tickers.`,
    );
  }
  return new ApiError(
    'network',
    'Could not reach the analysis service. Check your connection and try again.',
  );
}
