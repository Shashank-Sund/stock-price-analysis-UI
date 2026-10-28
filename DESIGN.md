# Design notes

A short record of the design decisions behind the React front end and the public sources they draw on.

## Principles

- **Content first.** The data is the product. Chrome is quiet: neutral zinc surfaces, one accent color, thin borders, small shadows. Charts use thin marks (2 px lines, bars at most 24 px wide with 4 px rounded ends), hairline grids and muted axis text.
- **One accent.** A violet primary (a nod to the original site's `#553c9a`) is used only for the Analyze button, the logo tile, focus rings and pressed toggles. Chart colors are a separate, data only palette.
- **Self-explanatory.** The audience includes recruiters, so every metric carries a one line explanation: visible captions on the KPI cards and statistics tables, and an info button (opens on hover, focus or tap) in table headers. Every chart has a text summary under it, written from the data ("The deepest drawdown was -13.80%, from the peak on Dec 2, 2025 ...").
- **Spacing scale.** Tailwind's 4 px base scale. Cards use 16 to 24 px padding, controls are 28 to 36 px tall, sections are 24 px apart. Page width caps at 72rem (`max-w-6xl`) with 16 px gutters on phones.
- **Typography.** The system UI font stack. Tickers use the monospace stack. Table columns, axis ticks and dates use `tabular-nums`; large KPI values keep proportional figures.
- **Numbers.** Percentages carry a sign (+12.34%, -3.10%), prices have two decimals and grouping, ratios two decimals, volumes are compact (47.8M), dates read "Jan 2, 2025" and are formatted in UTC so the viewer's time zone never shifts a day. Missing values show "n/a". No en or em dashes anywhere; negative numbers use the ASCII minus.
- **Layout.** Header and form, then the summary (KPI cards for one ticker, a table for several), the price chart, and the detail tabs (Returns, Risk, Seasonality, Compare). One ticker switcher state drives the price chart and the per ticker tabs; the summary table's ticker names select too. On phones everything is one column; wide tables scroll inside their card with a sticky first column, and the seasonality heatmap becomes a 6 by 2 month grid per year. The screenshot script fails a run when any page scrolls sideways at 390 px.
- **Loading.** The button shows a spinner and elapsed seconds until the request settles. The skeleton has the dashboard's shape (8 KPI tiles or table rows, the price chart, the tabs). The dashboard code starts downloading when the request starts, so it is usually ready before the data.
- **Errors.** One destructive Alert with the backend's own message (`{"error": ...}` shown as is) and a Try again button; other failures (old crash JSON, HTTP status, unreadable response, network, timeout) get a plain sentence. A render error or a failed chunk load inside the dashboard is caught by an error boundary with a readable message.
- **Motion.** Small entrance fades, defined inside `@media (prefers-reduced-motion: no-preference)`. Recharts animations and Lightweight Charts' kinetic scrolling are off when reduced motion is requested; skeleton pulse and the spinner use `motion-safe:`.
- **Dark mode.** Class based (`.dark` on `<html>`), following `prefers-color-scheme` until the user picks, saved in localStorage and applied before first paint. Recharts reads colors as CSS custom properties, so it follows the theme with no JavaScript; Lightweight Charts draws on canvas, so its colors are resolved from the same tokens (through a 1 x 1 canvas, which also converts `oklch()`) whenever the theme class changes.

## Charts

- **Libraries.** TradingView Lightweight Charts for the price chart (fast canvas rendering, native zoom, pan, crosshair, candlesticks and a separate volume pane). Recharts 3 for everything else, through a local adaptation of the shadcn/ui chart component (a config that maps series to labels and colors, exposed as `--color-<key>` properties, plus a themed tooltip and legend). The heatmap and correlation matrix are plain HTML tables, which keeps values readable and accessible.
- **Price chart.** Opens as a line; candlesticks are one click away and drawn hollow when up and filled when down, so direction does not depend on color. The 50 day average is a solid gray line and the 200 day a dashed lighter gray, so they never compete with ticker colors. A log scale toggle helps long ranges. Volume sits in its own pane. On touch screens vertical swipes scroll the page and horizontal drags pan the chart.
- **Categorical colors.** Eight slots in a fixed order (blue, orange, aqua, amber, magenta, green, violet, red) with a separately stepped dark mode set. The order was checked with a color vision deficiency validator (OKLab distance under simulated protanopia and deuteranopia on adjacent pairs: worst 9.1 light, 8.4 dark; normal vision worst 19.6 and 19.3) against this site's card surfaces. A ticker keeps its color everywhere (price chart, legend, tables, comparisons), and colors follow the ticker, not its rank. Tickers 9 and 10 reuse slots 1 and 2 with dashed lines rather than inventing new hues. Three light mode slots are below 3:1 contrast on white, so every multi series chart has a legend or direct labels, and values are always available in text.
- **Benchmark.** SPY is always a neutral gray dashed line (or a hollow dot), visually secondary to the tickers, even when the user entered SPY; it then appears once, as a ticker.
- **Diverging scale.** Monthly returns and correlations run red (below zero) through a neutral gray to blue (above zero), mixed in OKLCH with `color-mix()`. The neutral midpoint and both poles are themed, and cell text switches to white only on strong fills. The heatmap's scale saturates at the 90th percentile of absolute monthly returns so one outlier does not wash out the rest. Values are printed in every cell, so color is never the only signal; partial months and years are outlined with a dashed border and starred.
- **Interval.** Ranges over 5 years arrive as weekly bars; the price card shows a "Weekly bars" note, tooltips say "Week ending", the volume pane and the CSV column are labeled weekly, and the histogram notes that statistics come from daily closes.
- **Axes.** Time axes use evenly spaced month or year starts; percentage ticks drop the decimal on whole values and switch to compact form from 1,000% ("40K%"). The comparison chart starts on a log axis (ticks at 0%, 100%, 300%, 1K%, ...) when any line gains more than 300%, so smaller lines are not flattened. Scatter labels pick a side that avoids other labels and dots.

## Accessibility

Labels on every control, `aria-invalid` and `aria-describedby` on fields with errors, `role="alert"` for failures, a polite live region that announces when an analysis is ready, `aria-busy` while loading, `aria-pressed` on every toggle (chart type, averages, log scale, ticker switcher, legend entries), a skip link and visible focus rings. The detail tabs are Radix Tabs: arrow keys move between tabs, Home and End jump. Each chart is a `<figure>` with an accessible name and its text summary as the description; the canvas itself is hidden from assistive tech. Statistics, the heatmap and the correlation matrix are real tables with header cells. Muted text meets WCAG AA on both themes.

## Security

The app only reads JSON from the API and never injects server text as HTML. Unknown shapes produce a generic message.

## Sources and licenses

| Source | What was borrowed | License |
| --- | --- | --- |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Component structure and class recipes for Button, Card, Input, Badge, Alert, Skeleton, Tooltip and Tabs; the chart component pattern (ChartContainer, config driven colors, tooltip content), adapted for Recharts 3; the CSS variable token naming and the zinc palette | MIT |
| [Radix UI Primitives](https://github.com/radix-ui/primitives) | Tooltip and Tabs behavior, as npm dependencies | MIT |
| [Recharts](https://github.com/recharts/recharts) | Histogram, volatility, drawdown, monthly bars, comparison lines and scatter, as an npm dependency | MIT |
| [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts) | Price, candlestick and volume chart, as an npm dependency. Its NOTICE requires attribution, given by the "Charts by TradingView" link in the footer | Apache 2.0 |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | Utility classes, spacing scale, `@theme` tokens, `motion-safe` variant | MIT |
| [Lucide](https://github.com/lucide-icons/lucide) | Icons via `lucide-react` | ISC |
| [Tremor](https://github.com/tremorlabs/tremor) | Pattern reference only (no code): KPI card anatomy, card headers with right aligned actions, restrained gray surfaces | Apache 2.0 |
| [class-variance-authority](https://github.com/joe-bell/cva), [clsx](https://github.com/lukeed/clsx), [tailwind-merge](https://github.com/dcastil/tailwind-merge) | Variant and class name helpers | Apache 2.0, MIT, MIT |
| Machado, Oliveira and Fernandes (2009), "A Physiologically-based Model for Simulation of Color Vision Deficiency" | The simulation used to check the categorical palette's separation | Paper (method only) |
| [Adrian Roselli, "More Accessible Skeletons"](https://adrianroselli.com/2020/11/more-accessible-skeletons.html) | Hide skeleton shapes from assistive tech, announce state with `aria-busy` and a live region | Article (ideas only) |
| [Toyota Europe design playbook, Skeleton](https://dx-playbook-prev.toyota-europe.com/cds/components/skeleton/) | Static fill when reduced motion is requested (WCAG 2.2.2) | Article (ideas only) |
| Databricks app-templates (`appkit-*` clients) | Looked at for overall feel only. No code was copied: that repository's license limits use to the Databricks platform. | Databricks License |

The mock API's synthetic responses come from a deterministic simulation, not market data. The recorded fixtures in `mock-api/fixtures/backend/` are real responses from the backend (Yahoo Finance data through yfinance).
