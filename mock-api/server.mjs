#!/usr/bin/env node
/**
 * Local mock of the Stock Price Analysis API. Mirrors the production contract:
 * POST JSON {start_date, end_date, symbol}. Like the real non-proxy API Gateway
 * integration, the HTTP 200 response text is the Lambda's return value serialized as JSON:
 *   {"statusCode": 200, "body": "<!DOCTYPE html>...<img src='data:image/png;base64,...' alt='...'>...",
 *    "headers": {"Content-Type": "text/html"}}
 * with the HTTP Content-Type header saying text/html. The charts are synthetic (./fixtures).
 * Set MOCK_FORMAT=html to send the bare HTML document instead (proxy style fallback).
 *
 * Special tickers pick a scenario (case insensitive, anywhere in the symbol list):
 *   ERR      HTTP 200 envelope whose body has <div class='eda-error' role='alert'>...</div>
 *   CRASH    HTTP 200 with the old backend crash JSON {"errorMessage", "errorType"}
 *   SLOW     success after 5 seconds
 *   HANG     waits 40 seconds (longer than the client timeout)
 *   NOALT    success in the old format (no alt attributes)
 *   EMPTY    HTTP 200 with an HTML body that has no charts
 *   HTTP500  HTTP 500 with {"message": "Internal server error"}
 * Anything else succeeds: one ticker returns up to 5 charts, several return 1.
 *
 * JSON mode: a body with "format": "json" gets the chart data response (docs/json-api.md in
 * the backend repo) in the Lambda envelope {"statusCode", "headers", "body": "<JSON string>"}.
 * A request that matches one of the real backend responses in ./fixtures/backend (same
 * dates, same tickers in any order) gets that file byte for byte. Anything else is built by
 * ./synth.mjs from simulated prices (MOCK_SOURCE=synth forces that). Unknown tickers (QX...,
 * ZZ..., ERR, XYZ, FAKE, NOPE) get the backend's "No data found" error, and the 10 ticker
 * and 20 year limits are enforced. SLOW, HANG, CRASH and HTTP500 work as above; BADJSON
 * answers with HTML (an unreadable response) and NOSPY simulates a failed benchmark download.
 *
 * Usage: npm run mock-api   (PORT=8787, MOCK_DELAY_MS=1200 by default)
 */
import { createServer } from 'node:http';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleJson } from './synth.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const DELAY_MS = Number(process.env.MOCK_DELAY_MS ?? 1200);
const FORMAT = process.env.MOCK_FORMAT === 'html' ? 'html' : 'envelope';

const png = (name) => readFileSync(join(here, 'fixtures', `${name}.png`)).toString('base64');
const FIXTURES = {
  closing: { title: 'Closing Stock Price Over Time', b64: png('closing') },
  yearly: { title: 'Closing Stock Prices by Year', b64: png('yearly') },
  correlation: { title: 'Correlation Between Stock Prices', b64: png('correlation') },
  distribution: { title: 'Distribution of Closing Stock Price', b64: png('distribution') },
  returns: { title: 'Daily Returns', b64: png('returns') },
  multi: { title: 'Closing Stock Price of Multiple Companies Over Time', b64: png('multi') },
};

const SOURCE = process.env.MOCK_SOURCE === 'synth' ? 'synth' : 'auto';

/** Real backend responses keyed by "start|end|tickers, sorted". */
const fixtureKey = (start, end, tickers) => `${start}|${end}|${[...new Set(tickers)].sort().join(',')}`;
const BACKEND = new Map();
for (const file of readdirSync(join(here, 'fixtures', 'backend')).filter((f) => f.endsWith('.json'))) {
  const text = readFileSync(join(here, 'fixtures', 'backend', file), 'utf8').trim();
  const body = JSON.parse(JSON.parse(text).body);
  if (body.tickers) BACKEND.set(fixtureKey(body.start_date, body.end_date, body.tickers), { file, text });
}
// The unknown ticker fixture has no tickers in its body; key it by its request.
const unknown = readFileSync(join(here, 'fixtures', 'backend', 'error-unknown.json'), 'utf8').trim();
BACKEND.set(fixtureKey('2025-10-28', '2026-10-28', ['QXZQZ']), { file: 'error-unknown.json', text: unknown });

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const doc = (body) =>
  `<!DOCTYPE html>\n<html>\n<head>\n<title>My Basic HTML Page</title>\n</head>\n<body>${body}</body>\n</html>`;

const img = (f, withAlt) =>
  withAlt
    ? `<img src='data:image/png;base64,${f.b64}' alt='${escapeAttr(f.title)}'>`
    : `<img src='data:image/png;base64,${f.b64}'>`;

/** Wraps an HTML document the way the non-proxy API Gateway integration does. */
const page = (body) =>
  FORMAT === 'html'
    ? doc(body)
    : JSON.stringify({ statusCode: 200, body: doc(body), headers: { 'Content-Type': 'text/html' } });

function charts(tickers, start, end, withAlt) {
  if (tickers.length > 1) return page(img(FIXTURES.multi, withAlt));
  const spansYears = String(start).slice(0, 4) !== String(end).slice(0, 4);
  const list = [FIXTURES.closing, ...(spansYears ? [FIXTURES.yearly] : []), FIXTURES.correlation, FIXTURES.distribution, FIXTURES.returns];
  return page(list.map((f) => img(f, withAlt)).join(''));
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '600',
};

function send(res, status, body, type = 'text/html; charset=utf-8') {
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(status, { ...CORS, 'Content-Type': type });
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    send(res, 405, JSON.stringify({ message: 'Method not allowed' }), 'application/json');
    return;
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    send(res, 400, JSON.stringify({ message: 'Invalid JSON' }), 'application/json');
    return;
  }

  const { start_date: start = '', end_date: end = '', symbol = '' } = payload;
  const tickers = String(symbol)
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const has = (t) => tickers.includes(t);
  const json = payload.format === 'json';
  console.log(`[mock-api] ${new Date().toISOString()} ${start} to ${end} symbol=${tickers.join(',') || '(none)'}`);

  if (has('HANG')) {
    await sleep(40_000);
    send(res, 504, JSON.stringify({ message: 'Endpoint request timed out' }), 'application/json');
    return;
  }

  await sleep(has('SLOW') ? 5000 : DELAY_MS);

  if (json && !has('CRASH') && !has('HTTP500')) {
    if (has('BADJSON')) {
      send(res, 200, '<!DOCTYPE html><html><body><p>Not what you expected</p></body></html>');
      return;
    }
    const scenario = new Set(['SLOW', 'NOSPY']);
    const real = SOURCE === 'auto' ? BACKEND.get(fixtureKey(start, end, tickers.filter((t) => !scenario.has(t)))) : null;
    if (real && !has('NOSPY')) {
      console.log(`[mock-api]   served fixtures/backend/${real.file}`);
      send(res, 200, real.text, 'application/json');
      return;
    }
    const symbol = tickers.filter((t) => !scenario.has(t)).join(',') || (has('SLOW') ? 'AAPL' : '');
    const result = handleJson(
      { ...payload, symbol },
      { today: localToday(), benchmarkAvailable: !has('NOSPY') },
    );
    send(res, 200, JSON.stringify(result), 'application/json');
    return;
  }

  if (has('CRASH')) {
    send(
      res,
      200,
      JSON.stringify({ errorMessage: "'NoneType' object is not subscriptable", errorType: 'TypeError', stackTrace: [] }),
      'application/json',
    );
  } else if (has('HTTP500')) {
    send(res, 500, JSON.stringify({ message: 'Internal server error' }), 'application/json');
  } else if (has('ERR')) {
    const bad = tickers.find((t) => t === 'ERR');
    send(res, 200, page(`<div class='eda-error' role='alert'>${escapeText(`No data found for ${bad} between ${start} and ${end}`)}</div>`));
  } else if (has('EMPTY')) {
    send(res, 200, page('<p>Nothing to see here</p>'));
  } else if (tickers.length === 0) {
    send(res, 200, page("<div class='eda-error' role='alert'>Please provide at least one ticker symbol</div>"));
  } else {
    send(res, 200, charts(tickers, start, end, !has('NOALT')));
  }
});

server.listen(PORT, () => {
  console.log(`[mock-api] listening on http://localhost:${PORT} (delay ${DELAY_MS} ms, format ${FORMAT})`);
  console.log('[mock-api] scenarios by ticker: ERR, CRASH, SLOW, HANG, NOALT, EMPTY, HTTP500, BADJSON, NOSPY');
  console.log(`[mock-api] JSON: ${SOURCE === 'auto' ? `${BACKEND.size} real backend responses, synthetic data otherwise` : 'synthetic data only'}`);
});
