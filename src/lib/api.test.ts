import { describe, expect, it, vi } from 'vitest';
import { BUSY_MESSAGE, DEFAULT_API_URL, fetchAnalysis, parseJsonResponse, toJsonRequestBody, UNEXPECTED_MESSAGE } from './api';
import { ENVELOPES, httpText, SINGLE } from '@/test/json-fixtures';

const req = { startDate: '2025-10-28', endDate: '2026-10-28', tickers: ['AAPL'] };
const fetchReturning = (body: string, init: ResponseInit = { status: 200 }) => vi.fn(async () => new Response(body, init));

it('defaults to the production URL when VITE_API_URL is not set', () => {
  expect(DEFAULT_API_URL).toBe('https://mgpqvaaqhh.execute-api.us-east-1.amazonaws.com/Prod');
});

describe('toJsonRequestBody', () => {
  it('adds format json to the existing body', () => {
    expect(toJsonRequestBody({ ...req, tickers: ['AAPL', 'MSFT'] })).toEqual({
      start_date: '2025-10-28',
      end_date: '2026-10-28',
      symbol: 'AAPL,MSFT',
      format: 'json',
    });
  });

  it('sends tickers as typed, including SPY with 10 other tickers', () => {
    expect(toJsonRequestBody({ ...req, tickers: ['TSLA', 'SPY'] }).symbol).toBe('TSLA,SPY');
    expect(toJsonRequestBody({ ...req, tickers: ['SPY'] }).symbol).toBe('SPY');
    const ten = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const typed = [...ten.slice(0, 5), 'SPY', ...ten.slice(5)];
    expect(toJsonRequestBody({ ...req, tickers: typed }).symbol).toBe(typed.join(','));
  });
});

describe('parseJsonResponse', () => {
  it('parses the envelope twice', () => {
    const r = parseJsonResponse(httpText(ENVELOPES.single1y));
    expect(r.kind).toBe('data');
    if (r.kind === 'data') {
      expect(r.data.tickers).toEqual(['AAPL']);
      expect(r.data.benchmark).toBe('SPY');
      expect(r.data.series.AAPL.prices.date.length).toBe(r.data.series.AAPL.risk.drawdown.length);
    }
  });

  it('accepts a bare success body', () => {
    expect(parseJsonResponse(JSON.stringify(SINGLE)).kind).toBe('data');
  });

  it('shows the error message as is', () => {
    expect(parseJsonResponse(httpText(ENVELOPES.unknown))).toEqual({
      kind: 'error',
      message: 'No data found for QXZQZ between 2025-10-28 and 2026-10-28. Check the ticker symbol and the date range.',
    });
  });

  it('handles old crash and API Gateway shapes', () => {
    expect(parseJsonResponse('{"errorMessage":"boom","errorType":"TypeError"}')).toEqual({
      kind: 'error',
      message: 'The analysis service failed: boom',
    });
    expect(parseJsonResponse('{"message":"Endpoint request timed out"}')).toEqual({
      kind: 'error',
      message: 'The analysis service returned an error: Endpoint request timed out',
    });
  });

  it.each([
    ['HTML', '<!DOCTYPE html><html><body><img src="x"></body></html>'],
    ['empty', ''],
    ['an envelope with HTML in body', JSON.stringify({ statusCode: 200, body: '<html></html>' })],
    ['an unknown object', '{"hello":"world"}'],
  ])('gives a generic readable error for %s', (_name, text) => {
    expect(parseJsonResponse(text)).toEqual({ kind: 'error', message: UNEXPECTED_MESSAGE });
  });
});

describe('fetchAnalysis', () => {
  it('POSTs JSON with format json and returns the data', async () => {
    const fetchImpl = fetchReturning(httpText(ENVELOPES.single1y));
    const data = await fetchAnalysis(req, { fetchImpl, url: '/api' });
    expect(data.series.AAPL.summary.trading_days).toBeGreaterThan(200);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api');
    expect(JSON.parse(init.body as string)).toMatchObject({ symbol: 'AAPL', format: 'json' });
  });

  it('throws the backend error', async () => {
    await expect(fetchAnalysis(req, { fetchImpl: fetchReturning(httpText(ENVELOPES.unknown)) })).rejects.toMatchObject({
      kind: 'server',
      message: expect.stringMatching(/^No data found for QXZQZ/),
    });
  });

  it('reports HTTP failures with the status', async () => {
    const e = await fetchAnalysis(req, { fetchImpl: fetchReturning('oops', { status: 502, statusText: 'Bad Gateway' }) }).catch(
      (x) => x,
    );
    expect(e).toMatchObject({ kind: 'http', message: expect.stringContaining('HTTP 502') });
  });

  it('maps fetch failures to a network error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(fetchAnalysis(req, { fetchImpl })).rejects.toMatchObject({ kind: 'network' });
  });

  it('times out', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const e = await fetchAnalysis(req, { fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 20 }).catch((x) => x);
    expect(e.kind).toBe('timeout');
  });

  describe('when the service is busy', () => {
    // The exact answer API Gateway gave on staging for a request over the Lambda's concurrency cap.
    const busy = () => new Response('{"message": "Internal server error"}', { status: 500 });
    const ok = () => new Response(httpText(ENVELOPES.single1y), { status: 200 });
    const sequence = (...replies: (() => Response)[]) => {
      const fetchImpl = vi.fn(async () => (replies.shift() ?? busy)());
      return fetchImpl as unknown as typeof fetch & typeof fetchImpl;
    };

    it('retries quietly and returns the data', async () => {
      const fetchImpl = sequence(busy, busy, ok);
      const data = await fetchAnalysis(req, { fetchImpl, retryDelaysMs: [1, 1] });
      expect(data.series.AAPL).toBeDefined();
      expect(fetchImpl).toHaveBeenCalledTimes(3);
    });

    it('gives up after the retries with a friendly message', async () => {
      const fetchImpl = sequence();
      const e = await fetchAnalysis(req, { fetchImpl, retryDelaysMs: [1, 1] }).catch((x) => x);
      expect(e).toMatchObject({ kind: 'busy', message: BUSY_MESSAGE });
      expect(fetchImpl).toHaveBeenCalledTimes(3);
    });

    it('treats a 429 throttle as busy', async () => {
      const fetchImpl = sequence(() => new Response('{"message":"Too Many Requests"}', { status: 429 }), ok);
      await expect(fetchAnalysis(req, { fetchImpl, retryDelaysMs: [1] })).resolves.toBeDefined();
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('does not retry other errors', async () => {
      const fetchImpl = sequence(() => new Response(httpText(ENVELOPES.unknown), { status: 200 }));
      await expect(fetchAnalysis(req, { fetchImpl, retryDelaysMs: [1, 1] })).rejects.toMatchObject({ kind: 'server' });
      const gateway = sequence(() => new Response('oops', { status: 502 }));
      await expect(fetchAnalysis(req, { fetchImpl: gateway, retryDelaysMs: [1, 1] })).rejects.toMatchObject({ kind: 'http' });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(gateway).toHaveBeenCalledTimes(1);
    });

    it('stops waiting when the request is cancelled', async () => {
      const ctrl = new AbortController();
      const fetchImpl = sequence(busy, ok);
      const pending = fetchAnalysis(req, { fetchImpl, signal: ctrl.signal, retryDelaysMs: [60_000] });
      await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
      ctrl.abort();
      await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
  });
});
