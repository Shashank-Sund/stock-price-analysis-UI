#!/usr/bin/env node
/**
 * Local mock of the Stock Price Analysis API. Mirrors the backend contract:
 * POST JSON {start_date, end_date, symbol} and get back an HTML document whose
 * <body> holds base64 PNG <img> tags (synthetic charts from ./fixtures).
 *
 * Special tickers pick a scenario (case insensitive, anywhere in the symbol list):
 *   ERR      HTTP 200 with <div class="eda-error" role="alert">...</div>
 *   CRASH    HTTP 200 with the old backend crash JSON {"errorMessage", "errorType"}
 *   SLOW     success after 5 seconds
 *   HANG     waits 40 seconds (longer than the client timeout)
 *   NOALT    success in the old format (no alt attributes)
 *   EMPTY    HTTP 200 with an HTML body that has no charts
 *   HTTP500  HTTP 500 with {"message": "Internal server error"}
 * Anything else succeeds: one ticker returns up to 5 charts, several return 1.
 *
 * Usage: npm run mock-api   (PORT=8787, MOCK_DELAY_MS=1200 by default)
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const DELAY_MS = Number(process.env.MOCK_DELAY_MS ?? 1200);

const png = (name) => readFileSync(join(here, 'fixtures', `${name}.png`)).toString('base64');
const FIXTURES = {
  closing: { title: 'Closing Stock Price Over Time', b64: png('closing') },
  yearly: { title: 'Closing Stock Prices by Year', b64: png('yearly') },
  correlation: { title: 'Correlation Between Stock Prices', b64: png('correlation') },
  distribution: { title: 'Distribution of Closing Stock Price', b64: png('distribution') },
  returns: { title: 'Daily Returns', b64: png('returns') },
  multi: { title: 'Closing Stock Price of Multiple Companies Over Time', b64: png('multi') },
};

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const page = (body) =>
  `<!DOCTYPE html>\n<html>\n<head>\n<title>My Basic HTML Page</title>\n</head>\n<body>${body}</body>\n</html>`;

const img = (f, withAlt) =>
  withAlt
    ? `<img src='data:image/png;base64,${f.b64}' alt='${escapeAttr(f.title)}'>`
    : `<img src='data:image/png;base64,${f.b64}'>`;

function charts(tickers, start, end, withAlt) {
  if (tickers.length > 1) return page(img(FIXTURES.multi, withAlt));
  const spansYears = String(start).slice(0, 4) !== String(end).slice(0, 4);
  const list = [FIXTURES.closing, ...(spansYears ? [FIXTURES.yearly] : []), FIXTURES.correlation, FIXTURES.distribution, FIXTURES.returns];
  return page(list.map((f) => img(f, withAlt)).join(''));
}

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
  console.log(`[mock-api] ${new Date().toISOString()} ${start} to ${end} symbol=${tickers.join(',') || '(none)'}`);

  if (has('HANG')) {
    await sleep(40_000);
    send(res, 504, JSON.stringify({ message: 'Endpoint request timed out' }), 'application/json');
    return;
  }

  await sleep(has('SLOW') ? 5000 : DELAY_MS);

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
    send(res, 200, page(`<div class="eda-error" role="alert">${escapeText(`No data found for ${bad} between ${start} and ${end}`)}</div>`));
  } else if (has('EMPTY')) {
    send(res, 200, page('<p>Nothing to see here</p>'));
  } else if (tickers.length === 0) {
    send(res, 200, page('<div class="eda-error" role="alert">Please provide at least one ticker symbol</div>'));
  } else {
    send(res, 200, charts(tickers, start, end, !has('NOALT')));
  }
});

server.listen(PORT, () => {
  console.log(`[mock-api] listening on http://localhost:${PORT} (delay ${DELAY_MS} ms)`);
  console.log('[mock-api] scenarios by ticker: ERR, CRASH, SLOW, HANG, NOALT, EMPTY, HTTP500');
});
