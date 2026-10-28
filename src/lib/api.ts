/**
 * Client for the JSON response of the analysis API.
 *
 * The request is the existing POST body plus `"format": "json"`. API Gateway uses a
 * non-proxy integration, so the HTTP status is 200 and the text is the Lambda's return
 * value: {"statusCode": 200, "headers": {...}, "body": "<JSON string>"}. We parse twice.
 * Errors arrive as {"error": "..."} inside body (statusCode 400 or 500) and are shown as is.
 *
 * The local Lambda runtime emulator returns the same envelope. A bare success or error
 * object (a future proxy integration) is accepted too.
 */
import type { AnalysisResponse } from './types';

export const DEFAULT_API_URL = 'https://mgpqvaaqhh.execute-api.us-east-1.amazonaws.com/Prod';
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || DEFAULT_API_URL;

/** API Gateway gives up at 29 s; we wait a little longer so its own error can arrive first. */
export const REQUEST_TIMEOUT_MS = 35_000;

/**
 * Waits before retrying when the service is busy. The Lambda has a cap on copies running
 * at once (a cost guard); a request over the cap fails in well under a second with HTTP 500
 * {"message": "Internal server error"} from API Gateway, and its stage throttle answers 429.
 */
export const BUSY_RETRY_DELAYS_MS = [1_000, 2_000];

export interface AnalysisRequest {
  startDate: string;
  endDate: string;
  tickers: string[];
}

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'server' | 'busy' | 'aborted';

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
  retryDelaysMs?: number[];
}

export const BENCHMARK = 'SPY';

export const BUSY_MESSAGE = 'The service is busy right now. Try again in a few seconds.';

export const UNEXPECTED_MESSAGE =
  'The analysis service sent a response this page could not read. Please try again in a moment.';

/**
 * Builds the POST body: the original fields plus format json. Tickers are sent as typed;
 * the backend does not count SPY toward its 10 ticker limit.
 */
export function toJsonRequestBody(req: AnalysisRequest) {
  return { start_date: req.startDate, end_date: req.endDate, symbol: req.tickers.join(','), format: 'json' as const };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

/** A user facing message from any error shape we know, or null. */
export function errorMessageFrom(value: unknown): string | null {
  if (!isObject(value)) return null;
  if (typeof value.error === 'string' && value.error.trim()) return value.error.trim();
  // Old Lambda crash format.
  if (typeof value.errorMessage === 'string' && value.errorMessage.trim()) {
    return `The analysis service failed: ${value.errorMessage.trim()}`;
  }
  // API Gateway errors, e.g. {"message": "Endpoint request timed out"}.
  if (typeof value.message === 'string' && value.message.trim()) {
    return `The analysis service returned an error: ${value.message.trim()}`;
  }
  return null;
}

function isAnalysisResponse(v: unknown): v is AnalysisResponse {
  return (
    isObject(v) &&
    Array.isArray(v.tickers) &&
    isObject(v.series) &&
    isObject(v.compare) &&
    v.tickers.every((t) => typeof t === 'string' && isObject((v.series as Record<string, unknown>)[t]))
  );
}

function tryJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

export type ParsedJsonResponse = { kind: 'data'; data: AnalysisResponse } | { kind: 'error'; message: string };

/** Parses the HTTP text: envelope (body is a JSON string) or a bare object. */
export function parseJsonResponse(text: string): ParsedJsonResponse {
  const outer = tryJson((text ?? '').trim());
  if (!outer.ok) return { kind: 'error', message: UNEXPECTED_MESSAGE };

  let payload: unknown = outer.value;
  if (isObject(payload) && 'body' in payload && ('statusCode' in payload || 'headers' in payload)) {
    const body = payload.body;
    if (typeof body === 'string') {
      const inner = tryJson(body);
      if (!inner.ok) return { kind: 'error', message: UNEXPECTED_MESSAGE };
      payload = inner.value;
    } else {
      payload = body;
    }
  }

  if (isAnalysisResponse(payload)) return { kind: 'data', data: payload };
  const message = errorMessageFrom(payload);
  return { kind: 'error', message: message ?? UNEXPECTED_MESSAGE };
}

/** True for API Gateway's answers when the function is at its concurrency cap or the stage is throttled. */
export function isBusyResponse(status: number, parsed: ParsedJsonResponse): boolean {
  if (status === 429 || status === 503) return true;
  return status === 500 && parsed.kind === 'error' && /internal server error$/i.test(parsed.message);
}

/** Fetches the analysis, retrying quietly while the service is busy. */
export async function fetchAnalysis(req: AnalysisRequest, opts: AnalyzeOptions = {}): Promise<AnalysisResponse> {
  const { retryDelaysMs = BUSY_RETRY_DELAYS_MS, signal } = opts;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOnce(req, opts);
    } catch (err) {
      if (!(err instanceof ApiError && err.kind === 'busy') || attempt >= retryDelaysMs.length) throw err;
      await wait(retryDelaysMs[attempt], signal);
    }
  }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ApiError('aborted', 'The request was cancelled.'));
    const done = () => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    };
    const timer = setTimeout(done, ms);
    const cancel = () => {
      clearTimeout(timer);
      reject(new ApiError('aborted', 'The request was cancelled.'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

async function fetchOnce(req: AnalysisRequest, opts: AnalyzeOptions): Promise<AnalysisResponse> {
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
  const fail = () => abortOrNetworkError(timedOut, Boolean(signal?.aborted), timeoutMs);

  try {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toJsonRequestBody(req)),
        signal: controller.signal,
      });
    } catch {
      throw fail();
    }

    let text: string;
    try {
      text = await res.text();
    } catch {
      throw fail();
    }

    const parsed = parseJsonResponse(text);
    if (isBusyResponse(res.status, parsed)) throw new ApiError('busy', BUSY_MESSAGE);
    if (!res.ok) {
      const detail = parsed.kind === 'error' && parsed.message !== UNEXPECTED_MESSAGE ? parsed.message : null;
      throw new ApiError(
        'http',
        detail ?? `The analysis service returned HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}. Please try again.`,
      );
    }
    if (parsed.kind === 'error') throw new ApiError('server', parsed.message);
    return parsed.data;
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
  return new ApiError('network', 'Could not reach the analysis service. Check your connection and try again.');
}
