#!/usr/bin/env node
/**
 * Local mock of the Stock Price Analysis API (JSON response, docs/json-api.md in the
 * backend repo). POST {start_date, end_date, symbol, format: "json"}. Like the real
 * non-proxy API Gateway integration (and the Lambda runtime emulator), the HTTP status is
 * 200 and the text is the Lambda's return value:
 *   {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": "<JSON string>"}
 *
 * A request that matches one of the real backend responses in ./fixtures/backend (same
 * dates, same tickers in any order) gets that file byte for byte. Anything else is built
 * by ./synth.mjs from simulated prices (MOCK_SOURCE=synth forces that).
 *
 * Scenario tickers (case insensitive, anywhere in the list):
 *   QX..., ZZ..., ERR, XYZ, FAKE, NOPE   unknown ticker: the backend's "No data found" error (statusCode 400)
 *   SLOW     success after 5 seconds
 *   HANG     waits 40 seconds (longer than the client timeout)
 *   CRASH    the old Lambda crash shape {"errorMessage", "errorType"}
 *   HTTP500  HTTP 500 with {"message": "Internal server error"}
 *   BADJSON  an HTML page instead of JSON (an unreadable response)
 *   NOSPY    the benchmark download fails (benchmark null)
 * The 10 symbol and 20 year limits are enforced with the backend's messages.
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
const SOURCE = process.env.MOCK_SOURCE === 'synth' ? 'synth' : 'auto';

/** Real backend responses keyed by "start|end|tickers, sorted". */
const fixtureKey = (start, end, tickers) => `${start}|${end}|${[...new Set(tickers)].sort().join(',')}`;
const BACKEND = new Map();
const dir = join(here, 'fixtures', 'backend');
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const text = readFileSync(join(dir, file), 'utf8').trim();
  const body = JSON.parse(JSON.parse(text).body);
  if (body.tickers) BACKEND.set(fixtureKey(body.start_date, body.end_date, body.tickers), { file, text });
}
// The unknown ticker fixture has no tickers in its body; key it by its request.
BACKEND.set(fixtureKey('2025-10-28', '2026-10-28', ['QXZQZ']), {
  file: 'error-unknown.json',
  text: readFileSync(join(dir, 'error-unknown.json'), 'utf8').trim(),
});

const SCENARIOS = new Set(['SLOW', 'HANG', 'CRASH', 'HTTP500', 'BADJSON', 'NOSPY']);

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

function send(res, status, body, type = 'application/json') {
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
    send(res, 405, JSON.stringify({ message: 'Method not allowed' }));
    return;
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    send(res, 400, JSON.stringify({ message: 'Invalid JSON' }));
    return;
  }

  const { start_date: start = '', end_date: end = '', symbol = '' } = payload;
  const tickers = String(symbol)
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const has = (t) => tickers.includes(t);
  console.log(`[mock-api] ${new Date().toISOString()} ${start} to ${end} symbol=${tickers.join(',') || '(none)'}`);

  if (payload.format !== 'json') {
    send(res, 200, JSON.stringify({ statusCode: 400, headers: {}, body: JSON.stringify({ error: 'This mock only serves "format": "json".' }) }));
    return;
  }
  if (has('HANG')) {
    await sleep(40_000);
    send(res, 504, JSON.stringify({ message: 'Endpoint request timed out' }));
    return;
  }
  await sleep(has('SLOW') ? 5000 : DELAY_MS);

  if (has('CRASH')) {
    send(res, 200, JSON.stringify({ errorMessage: "'NoneType' object is not subscriptable", errorType: 'TypeError', stackTrace: [] }));
    return;
  }
  if (has('HTTP500')) {
    send(res, 500, JSON.stringify({ message: 'Internal server error' }));
    return;
  }
  if (has('BADJSON')) {
    send(res, 200, '<!DOCTYPE html><html><body><p>Not what you expected</p></body></html>', 'text/html; charset=utf-8');
    return;
  }

  // SLOW on its own stands in for AAPL.
  const named = tickers.filter((t) => !SCENARIOS.has(t));
  const real = named.length ? named : has('SLOW') ? ['AAPL'] : [];
  const fixture = SOURCE === 'auto' && !has('NOSPY') ? BACKEND.get(fixtureKey(start, end, real)) : null;
  if (fixture) {
    console.log(`[mock-api]   served fixtures/backend/${fixture.file}`);
    send(res, 200, fixture.text);
    return;
  }
  const result = handleJson(
    { ...payload, symbol: real.join(',') },
    { today: localToday(), benchmarkAvailable: !has('NOSPY') },
  );
  send(res, 200, JSON.stringify(result));
});

server.listen(PORT, () => {
  console.log(`[mock-api] listening on http://localhost:${PORT} (delay ${DELAY_MS} ms)`);
  console.log(`[mock-api] ${SOURCE === 'auto' ? `${BACKEND.size} real backend responses, synthetic data otherwise` : 'synthetic data only'}`);
  console.log('[mock-api] scenarios by ticker: QX... (unknown), SLOW, HANG, CRASH, HTTP500, BADJSON, NOSPY');
});
