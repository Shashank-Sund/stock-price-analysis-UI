import { describe, expect, it } from 'vitest';
import { NO_CHARTS_MESSAGE, parseAnalysisResponse } from './parse';
import { BLUE_PNG, CRASH_JSON, EDA_ERROR, HOSTILE, MULTI_NEW, RED_PNG, SINGLE_NEW, SINGLE_OLD, dataUrl } from '@/test/fixtures/responses';

describe('parseAnalysisResponse', () => {
  it('extracts charts with titles from the new format', () => {
    const r = parseAnalysisResponse(SINGLE_NEW);
    expect(r.kind).toBe('charts');
    if (r.kind !== 'charts') return;
    expect(r.charts).toHaveLength(5);
    expect(r.charts.map((c) => c.title)).toEqual([
      'Closing Stock Price Over Time',
      'Closing Stock Prices by Year',
      'Correlation Between Stock Prices',
      'Distribution of Closing Stock Price',
      'Daily Returns',
    ]);
    expect(r.charts[0].src).toBe(dataUrl(RED_PNG));
    expect(r.charts[1].src).toBe(dataUrl(BLUE_PNG));
  });

  it('handles a multi ticker response with one chart', () => {
    const r = parseAnalysisResponse(MULTI_NEW);
    expect(r).toEqual({
      kind: 'charts',
      charts: [{ title: 'Closing Stock Price of Multiple Companies Over Time', src: dataUrl(BLUE_PNG) }],
    });
  });

  it('falls back to "Chart N" when alt is missing (old format)', () => {
    const r = parseAnalysisResponse(SINGLE_OLD);
    expect(r.kind === 'charts' && r.charts.map((c) => c.title)).toEqual(['Chart 1', 'Chart 2', 'Chart 3']);
  });

  it('treats a blank alt as missing', () => {
    const r = parseAnalysisResponse(`<body><img src='${dataUrl(RED_PNG)}' alt='   '></body>`);
    expect(r.kind === 'charts' && r.charts[0].title).toBe('Chart 1');
  });

  it('returns the eda-error message', () => {
    expect(parseAnalysisResponse(EDA_ERROR)).toEqual({
      kind: 'error',
      message: 'No data found for XYZ between 2024-01-01 and 2024-02-01',
    });
  });

  it('prefers eda-error over any images present', () => {
    const r = parseAnalysisResponse(
      `<body><img src='${dataUrl(RED_PNG)}'><div class="eda-error">Bad ticker</div></body>`,
    );
    expect(r).toEqual({ kind: 'error', message: 'Bad ticker' });
  });

  it('reads the old crash JSON format', () => {
    const r = parseAnalysisResponse(CRASH_JSON);
    expect(r.kind).toBe('error');
    expect(r.kind === 'error' && r.message).toBe(
      "The analysis service failed: 'NoneType' object is not subscriptable (TypeError)",
    );
  });

  it('reads an API Gateway style {"message"} error', () => {
    const r = parseAnalysisResponse('{"message":"Endpoint request timed out"}');
    expect(r).toEqual({ kind: 'error', message: 'The analysis service returned an error: Endpoint request timed out' });
  });

  it('unwraps a proxy envelope whose body is the HTML document', () => {
    const r = parseAnalysisResponse(JSON.stringify({ statusCode: 200, body: MULTI_NEW }));
    expect(r.kind === 'charts' && r.charts).toHaveLength(1);
  });

  it('keeps only safe base64 PNG data URLs and never executes scripts', () => {
    const w = window as unknown as { __pwned?: boolean };
    const r = parseAnalysisResponse(HOSTILE);
    expect(r).toEqual({ kind: 'charts', charts: [{ title: 'Real chart', src: dataUrl(RED_PNG) }] });
    expect(w.__pwned).toBeUndefined();
  });

  it.each([
    ['empty string', ''],
    ['plain text', 'Internal Server Error'],
    ['unrelated JSON', '{"foo": 1}'],
    ['JSON array', '[1,2,3]'],
    ['broken JSON', '{"errorMessage": '],
    ['HTML without charts', '<html><body><p>hello</p></body></html>'],
  ])('reports no charts for garbage: %s', (_name, body) => {
    expect(parseAnalysisResponse(body)).toEqual({ kind: 'error', message: NO_CHARTS_MESSAGE });
  });
});
