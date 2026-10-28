import { describe, expect, it, vi } from 'vitest';
import { fetchAnalysis, parseJsonResponse, toJsonRequestBody, UNEXPECTED_MESSAGE } from './analysis-api';
import { ENVELOPES, httpText, SINGLE } from '@/test/json-fixtures';

const req = { startDate: '2025-10-28', endDate: '2026-10-28', tickers: ['AAPL'] };
const fetchReturning = (body: string, init: ResponseInit = { status: 200 }) => vi.fn(async () => new Response(body, init));

describe('toJsonRequestBody', () => {
  it('adds format json to the existing body', () => {
    expect(toJsonRequestBody({ ...req, tickers: ['AAPL', 'MSFT'] })).toEqual({
      start_date: '2025-10-28',
      end_date: '2026-10-28',
      symbol: 'AAPL,MSFT',
      format: 'json',
    });
  });

  it('sends SPY when entered, unless it would exceed the backend limit of 10 symbols', () => {
    expect(toJsonRequestBody({ ...req, tickers: ['TSLA', 'SPY'] }).symbol).toBe('TSLA,SPY');
    expect(toJsonRequestBody({ ...req, tickers: ['SPY'] }).symbol).toBe('SPY');
    const ten = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    expect(toJsonRequestBody({ ...req, tickers: [...ten.slice(0, 5), 'SPY', ...ten.slice(5)] }).symbol).toBe(ten.join(','));
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
});
