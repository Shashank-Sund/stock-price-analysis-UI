import { describe, expect, it, vi } from 'vitest';
import { analyze, ApiError, DEFAULT_API_URL, toRequestBody } from './api';
import { CRASH_JSON, EDA_ERROR, ENVELOPE_EDA_ERROR, ENVELOPE_SINGLE, SINGLE_NEW } from '@/test/fixtures/responses';

const req = { startDate: '2024-01-01', endDate: '2024-12-31', tickers: ['AAPL', 'MSFT'] };

function fetchReturning(body: string, init: ResponseInit = { status: 200 }) {
  return vi.fn(async () => new Response(body, init));
}

describe('analyze', () => {
  it('POSTs the legacy JSON contract', async () => {
    const fetchImpl = fetchReturning(SINGLE_NEW);
    await analyze(req, { fetchImpl, url: 'http://mock.test' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://mock.test');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      symbol: 'AAPL,MSFT',
    });
  });

  it('defaults to the production URL when VITE_API_URL is not set', () => {
    expect(DEFAULT_API_URL).toBe('https://mgpqvaaqhh.execute-api.us-east-1.amazonaws.com/Prod');
    expect(toRequestBody({ ...req, tickers: ['AAPL'] }).symbol).toBe('AAPL');
  });

  it('returns charts from the JSON envelope served as text/html', async () => {
    const fetchImpl = fetchReturning(ENVELOPE_SINGLE, { status: 200, headers: { 'Content-Type': 'text/html' } });
    expect(await analyze(req, { fetchImpl })).toHaveLength(5);
  });

  it('throws the eda-error message from the JSON envelope', async () => {
    await expect(analyze(req, { fetchImpl: fetchReturning(ENVELOPE_EDA_ERROR) })).rejects.toMatchObject({
      kind: 'server',
      message: 'No data found for XYZ between 2024-01-01 and 2024-02-01',
    });
  });

  it('returns charts on success (bare HTML fallback)', async () => {
    const charts = await analyze(req, { fetchImpl: fetchReturning(SINGLE_NEW) });
    expect(charts).toHaveLength(5);
  });

  it('throws a server error for eda-error bodies', async () => {
    await expect(analyze(req, { fetchImpl: fetchReturning(EDA_ERROR) })).rejects.toMatchObject({
      kind: 'server',
      message: 'No data found for XYZ between 2024-01-01 and 2024-02-01',
    });
  });

  it('throws a server error for the crash JSON', async () => {
    await expect(analyze(req, { fetchImpl: fetchReturning(CRASH_JSON) })).rejects.toMatchObject({ kind: 'server' });
  });

  it('throws an http error for non 2xx responses', async () => {
    const e = await analyze(req, { fetchImpl: fetchReturning('oops', { status: 502, statusText: 'Bad Gateway' }) }).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.kind).toBe('http');
    expect(e.message).toContain('HTTP 502');
  });

  it('uses the JSON message of a non 2xx response when present', async () => {
    const e = await analyze(req, {
      fetchImpl: fetchReturning('{"message":"Internal server error"}', { status: 500 }),
    }).catch((x) => x);
    expect(e.message).toBe('The analysis service returned an error: Internal server error');
  });

  it('maps fetch failures to a network error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(analyze(req, { fetchImpl })).rejects.toMatchObject({ kind: 'network' });
  });

  it('times out with an AbortController', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const e = await analyze(req, { fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 20 }).catch((x) => x);
    expect(e.kind).toBe('timeout');
    expect(e.message).toMatch(/timed out/);
  });

  it('reports a caller cancellation as aborted', async () => {
    const ctrl = new AbortController();
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const p = analyze(req, { fetchImpl: fetchImpl as unknown as typeof fetch, signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ kind: 'aborted' });
  });
});
