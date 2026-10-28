# stock-price-analysis-UI

https://shaismarketpriceeda.com/

Front end for **Stock Price Analysis**, a tool that collects, cleans and visualizes historical market price data for exploratory data analysis. Pick a date range and one or more tickers: one ticker returns a full set of charts (closing price over time, yearly spread, correlation heatmap, distribution of close, daily returns); several tickers return one chart comparing their closing prices. The charts are produced by the back end at https://github.com/Shashank-Sund/docker-lambda-aws3.

Features: date presets (1M, 6M, YTD, 1Y, 5Y), ticker chips (Enter or comma to add, paste a list, Backspace to remove), per chart PNG download and full screen view, the last 5 successful searches as one click chips, light and dark themes, and clear loading and error states.

Stack: React 19, TypeScript, Vite 6, Tailwind CSS v4, Radix UI primitives, lucide-react icons and shadcn-style local components. Design notes and sources: [DESIGN.md](DESIGN.md).

## Architecture

![StockPriceAnalysisArchitecture drawio (2)](https://github.com/Shashank-Sund/docker-lambda-aws3/assets/29733360/cb3ad8a7-a0cc-40cf-afc1-c85786114be1)

AWS: S3, API Gateway, CloudFront, Route 53. The built site is **deployed to S3 + CloudFront by the backend repo's scripts**; this repo only produces the static `dist/` folder.

## Requirements

Node 20.6 or newer and npm 9 or newer.

```sh
npm install
```

## Commands

| Task | Command |
| --- | --- |
| Dev server (http://localhost:5173) | `npm run dev` |
| Dev server against the local mock API | `VITE_API_URL=http://localhost:8787 npm run dev` |
| Unit and component tests | `npm test` (watch mode: `npm run test:watch`) |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Production build into `dist/` | `npm run build` |
| Serve the build (http://localhost:4173) | `npm run preview` |
| Local mock API (http://localhost:8787) | `npm run mock-api` |
| Screenshots of a running preview (needs Google Chrome) | `npm run screenshots -- ./screenshots` |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `https://mgpqvaaqhh.execute-api.us-east-1.amazonaws.com/Prod` | Endpoint the app POSTs to. Point it at a staging API or the local mock. |

Vite reads it at build time, from the environment or from a `.env.local` file (see `.env.example`).

## API contract

```
POST $VITE_API_URL
Content-Type: application/json

{"start_date": "2024-01-01", "end_date": "2024-12-31", "symbol": "AAPL,MSFT"}
```

The API Gateway integration is non-proxy, so the response is HTTP 200 (with a `text/html` content type) whose text is the Lambda's return value serialized as JSON:

```json
{"statusCode": 200, "body": "<!DOCTYPE html>...<body><img src='data:image/png;base64,...' alt='Closing Stock Price Over Time'>...</body></html>", "headers": {"Content-Type": "text/html"}}
```

The app calls `response.text()` and tries `JSON.parse`. If the result has a string `body`, that HTML is parsed; if it has `errorMessage`, that is shown as an error (the old crash format); if the text is not JSON, it is parsed as HTML directly (local mock in `MOCK_FORMAT=html` mode, or a future proxy integration). HTML is parsed with `DOMParser` (never `innerHTML`) and only these are read:

- `<img src='data:image/png;base64,...'>` elements, titled by their `alt` attribute (or "Chart N" when there is none);
- `<div class='eda-error' role='alert'>message</div>`, shown as an error.

It also handles the old crash body `{"errorMessage": "...", "errorType": "..."}`, API Gateway `{"message": "..."}` errors, non 2xx statuses, network failures and a 35 second client timeout (API Gateway itself gives up at 29 seconds).

## Mock API

`npm run mock-api` starts a small Node server (no dependencies) on port 8787 with CORS enabled. It serves synthetic matplotlib charts from `mock-api/fixtures/` in the same JSON envelope as the production API (set `MOCK_FORMAT=html` to serve the bare HTML document instead). Ticker names select a scenario:

| Ticker | Response |
| --- | --- |
| any normal ticker, e.g. `AAPL` | 4 charts, or 5 when the range spans more than one calendar year |
| several tickers, e.g. `AAPL,MSFT` | 1 comparison chart |
| `ERR` | envelope whose body has the `eda-error` div: "No data found for ERR between ..." |
| `CRASH` | old crash JSON (`errorMessage`, `errorType`) |
| `SLOW` | success after 5 seconds |
| `HANG` | no answer for 40 seconds (exercises the client timeout) |
| `NOALT` | success in the old format, without `alt` attributes |
| `EMPTY` | HTML with no charts |
| `HTTP500` | HTTP 500 with `{"message": "Internal server error"}` |

`PORT`, `MOCK_DELAY_MS` (default 1200) and `MOCK_FORMAT` (`envelope` by default, or `html`) can be set in the environment.

Typical local loop:

```sh
npm run mock-api                                   # terminal 1
VITE_API_URL=http://localhost:8787 npm run dev     # terminal 2
```

## Project layout

```
index.html            app shell (applies the saved theme before first paint)
src/
  App.tsx             page state: form, validation, recent searches
  components/         Header, AnalyzeForm, TickerInput, Results, ChartCard, ChartDialog, Footer
  components/ui/      shadcn-style primitives (Button, Card, Input, Badge, Alert, Skeleton, Dialog, Tooltip)
  hooks/              useAnalysis (request lifecycle, elapsed timer), useTheme
  lib/                api, parse, validation, dates, tickers, recent, storage, download, theme
  test/               test setup and response fixtures (tiny real PNGs)
mock-api/             local mock server and fixture charts
scripts/              screenshot helper (playwright-core with local Chrome)
legacy/               the original static page (index.html, script.js, testfunction.html)
```
