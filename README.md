# stock-price-analysis-UI

https://shaismarketpriceeda.com/

New here? [GUIDE.md](GUIDE.md) explains everything the app does in plain language.

Front end for **Stock Price Analysis**, a tool that collects, cleans and explores historical market prices. Pick a date range and up to 10 tickers; the back end (https://github.com/Shashank-Sund/docker-lambda-aws3) returns prices and statistics as JSON and this site draws every chart in the browser:

- **Summary**: KPI cards for one ticker (total and annual return, volatility, Sharpe with a 0% risk-free rate, max drawdown with dates, best and worst day, period high and low, beta and return versus SPY), or a compact table with an SPY row for several. Every metric has a plain language explanation.
- **Price chart** (TradingView Lightweight Charts): line or candlesticks, 50 and 200 day averages, log scale, volume, zoom, pan and a crosshair tooltip, with a ticker switcher.
- **Returns**: daily return histogram with an optional normal curve and the 95% VaR, plus distribution statistics.
- **Risk**: rolling 30 day volatility and the drawdown chart with the worst drawdown highlighted.
- **Seasonality**: a years by months heatmap of monthly returns and the average return by calendar month.
- **Compare**: percent change since the start for all tickers with SPY as the benchmark, the correlation matrix of daily returns, and risk versus return.
- **CSV download** of prices, returns, drawdown and volatility for the selected ticker or all tickers.

SPY (an S&P 500 fund) is always the benchmark and does not count toward the 10 ticker limit. Ranges can be up to 20 years; ranges longer than 5 years are charted with weekly bars (statistics always use daily data).

Also: date presets, ticker chips, the last 5 searches as one click chips, light and dark themes, loading skeletons in the dashboard's shape and readable errors with a retry button.

Stack: React 19, TypeScript, Vite 6, Tailwind CSS v4, Radix UI, shadcn-style local components, Recharts 3 (through a shadcn style chart wrapper) and Lightweight Charts 5. Design notes and sources: [DESIGN.md](DESIGN.md).

## Architecture

![StockPriceAnalysisArchitecture drawio (2)](https://github.com/Shashank-Sund/docker-lambda-aws3/assets/29733360/cb3ad8a7-a0cc-40cf-afc1-c85786114be1)

AWS: S3, API Gateway, CloudFront, Route 53, and a Python Lambda in a Docker image (pandas, yfinance). The built site is **deployed to S3 + CloudFront by the backend repo's scripts**; this repo only produces the static `dist/` folder.

## Requirements

Node 20.6 or newer and npm 9 or newer.

```sh
npm install
```

## Commands

| Task | Command |
| --- | --- |
| Dev server (http://localhost:5173) | `npm run dev` |
| Unit and component tests | `npm test` (watch mode: `npm run test:watch`) |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Production build into `dist/` | `npm run build` |
| Serve the build (http://localhost:4173) | `npm run preview` |
| Local mock API (http://localhost:8787) | `npm run mock-api` |
| Screenshots of a running preview (Google Chrome) | `npm run screenshots -- ./screenshots [name filter]` |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `https://mgpqvaaqhh.execute-api.us-east-1.amazonaws.com/Prod` | Endpoint the app POSTs to, read at build time (environment or `.env.local`, see `.env.example`). Use `/api` with the local proxy below. |
| `API_PROXY_TARGET` | `http://localhost:9000/2015-03-31/functions/function/invocations` | Where `vite preview` and `vite` forward `POST /api`. |

## Running against the local backend Lambda

The backend Lambda runs locally in Docker under the Lambda runtime interface emulator on port 9000. Its invoke endpoint answers with the same envelope API Gateway sends. Vite's `server.proxy` and `preview.proxy` forward `POST /api` to it, so the browser talks to its own origin (no CORS):

```sh
# 1. Back end (in docker-lambda-aws3)
docker build --platform linux/arm64 -t stock-eda:local image
docker run -d --rm --name stock-eda-local --read-only --tmpfs /tmp -p 9000:8080 stock-eda:local

# 2. Front end (in this repo)
VITE_API_URL=/api npm run build
npx vite preview                 # http://localhost:4173; POST /api goes to localhost:9000

# 3. When done
docker rm -f stock-eda-local
```

Against the mock API instead:

```sh
npm run mock-api                                            # terminal 1, port 8787
VITE_API_URL=/api npm run build
API_PROXY_TARGET=http://localhost:8787 npx vite preview     # terminal 2
```

`npm run dev` uses the same proxy. (On Node 20.6.0 the Vite dev server can fail with Babel's "Cannot redefine property: File"; build plus preview works.)

## API contract

The full contract is `docs/json-api.md` in the backend repo. In short:

```
POST $VITE_API_URL
Content-Type: application/json

{"start_date": "2025-10-28", "end_date": "2026-10-28", "symbol": "AAPL,MSFT", "format": "json"}
```

The API Gateway integration is non-proxy, so the HTTP status is 200 and the text is the Lambda's return value: `{"statusCode": 200, "headers": {...}, "body": "<JSON string>"}`. The client parses the envelope, then `body`. A success body has `tickers`, `interval` (`1d` or `1wk`), `series` (one entry per ticker plus SPY: prices, summary, return statistics, risk series, seasonality), `benchmark` and `compare` (cumulative returns, correlation matrix, risk and return points). Errors are `{"error": "..."}` with statusCode 400 or 500, shown to the user as is.

The client also handles the old crash body `{"errorMessage": ...}`, API Gateway `{"message": ...}` errors, non 2xx statuses, an unreadable body (a generic "could not read" message), network failures and a 35 second client timeout (API Gateway gives up at 29 seconds). Tickers are sent as typed; the backend does not count SPY toward its limit of 10.

## Mock API

`npm run mock-api` starts a small Node server (no dependencies) on port 8787 with CORS enabled. It answers in two ways:

- **Real backend responses.** `mock-api/fixtures/backend/` holds responses recorded from the real Lambda (copied from the backend repo's `docs/fixtures/`): AAPL 1Y, MSFT 5Y, NVDA 10Y (weekly bars), AMZN 1M, AAPL, MSFT and NVDA 1Y, TSLA and SPY 1Y, 10 tickers over 20 years (weekly, 1.3 MB) and an unknown ticker error. A request with the same dates and tickers gets the file byte for byte. The tests use these files too.
- **Synthetic data** for any other request, built by `mock-api/synth.mjs` with the backend's definitions from a deterministic simulation (GARCH style volatility, betas against a market factor, a few stress episodes; not market data). It enforces the same 10 symbol and 20 year limits and uses weekly bars for ranges longer than 5 years. `MOCK_SOURCE=synth` always uses it.

Scenario tickers: unknown tickers (`QX...`, `ZZ...`, `ERR`, `XYZ`, `FAKE`, `NOPE`) get the backend's "No data found" message, `SLOW` answers after 5 seconds (as AAPL), `HANG` never in time, `CRASH` with the old crash JSON, `HTTP500` with an HTTP 500, `BADJSON` with an unreadable HTML page and `NOSPY` simulates a failed benchmark download. `PORT` and `MOCK_DELAY_MS` (default 1200) can be set in the environment.

## Bundle

The first paint only needs the form: the dashboard and each chart library load on demand (`React.lazy`), and the dashboard chunk starts downloading as soon as a request is sent. Approximate sizes (minified, gzip):

| Chunk | Loaded | Size |
| --- | --- | --- |
| `index` (React, form, shell) | first paint | 337 kB, 108 kB gzip |
| `Dashboard` (summary, tabs, CSV) | first analysis | 49 kB, 17 kB gzip |
| `lightweight-charts` + `PriceChart` | first analysis | 181 kB, 59 kB gzip |
| `recharts` + tab chunks | when a tab opens | 463 kB, 135 kB gzip |

## Project layout

```
index.html                app shell (applies the saved theme before first paint)
src/
  App.tsx                 page state: form, validation, recent searches
  components/             Header, AnalyzeForm, TickerInput, Results, HowItsBuilt, Footer, ErrorBoundary
  components/dashboard/   Dashboard (lazy), Summary, PriceCard and PriceChart, AnalysisTabs and the
                          Returns, Risk, Seasonality and Compare tabs, CSV actions
  components/ui/          shadcn-style primitives (Button, Card, Input, Badge, Alert, Skeleton, Tooltip,
                          InfoHint, Tabs, Chart)
  hooks/                  useAnalysis (request lifecycle), useTheme, useMedia (theme, reduced motion)
  lib/                    api (JSON client), types (contract), format, transforms, summaries, csv,
                          dashboard (view model and series colors), hints, validation, dates, tickers
  test/                   test setup, fixture loader, a Lightweight Charts stand in for jsdom
mock-api/                 mock server, synthetic data generator, real backend fixtures
scripts/                  screenshot helper (playwright-core with local Chrome)
legacy/                   the original static page (index.html, script.js, testfunction.html)
```
