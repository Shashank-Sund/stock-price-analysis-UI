#!/usr/bin/env node
/**
 * Dashboard screenshots of a running preview build against the mock API.
 *
 *   VITE_API_URL=/api npm run build
 *   npm run mock-api &
 *   API_PROXY_TARGET=http://localhost:8787 npx vite preview &
 *   npm run screenshots -- <outDir> [filter]
 *
 * Uses playwright-core with the local Google Chrome. Every scenario runs at 1280 and 390
 * px wide in light and dark. Console errors and page errors are printed and counted.
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const APP_URL = process.env.APP_URL ?? 'http://localhost:4173';
const outDir = resolve(process.argv[2] ?? 'screenshots');
const filter = process.argv[3] ? new RegExp(process.argv[3]) : null;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' },
);
let problems = 0;

async function open({ width, scheme }) {
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      problems++;
      console.log(`  [console.${m.type()}] ${m.text()}`);
    }
  });
  page.on('pageerror', (e) => {
    problems++;
    console.log(`  [pageerror] ${e.message}`);
  });
  await page.goto(APP_URL);
  return { page, context };
}

async function analyze(page, tickers, range) {
  if (typeof range === 'string') await page.getByRole('button', { name: range, exact: true }).click();
  else {
    await page.getByLabel('Start date').fill(range[0]);
    await page.getByLabel('End date').fill(range[1]);
  }
  const input = page.getByRole('textbox', { name: 'Tickers' });
  for (const t of tickers) {
    await input.fill(t);
    await input.press('Enter');
  }
  await page.getByRole('button', { name: /^analyze$/i }).click();
}

async function ready(page) {
  await page.getByRole('heading', { name: /at a glance|^Summary$/ }).waitFor({ timeout: 40000 });
  await page.getByTestId('price-chart-canvas').locator('canvas').first().waitFor({ timeout: 40000 });
  await page.waitForTimeout(600);
}

/** Counts a problem when the page scrolls sideways (content wider than the viewport). */
async function checkOverflow(page, label) {
  const { sw, vw } = await page.evaluate(() => ({ sw: globalThis.document.documentElement.scrollWidth, vw: globalThis.document.documentElement.clientWidth }));
  if (sw > vw) {
    problems++;
    console.log(`  [overflow] ${label}: page is ${sw}px wide in a ${vw}px viewport`);
  }
}

const shot = async (page, name, fullPage = true) => {
  await checkOverflow(page, name);
  // The sticky header would otherwise be captured mid page.
  if (fullPage) await page.evaluate(() => globalThis.scrollTo(0, 0));
  const path = join(outDir, `${name}.png`);
  await page.screenshot({ path, fullPage });
  console.log(`saved ${path}`);
};

/** Selects a dashboard tab if it exists and screenshots it. */
async function tab(page, name, label) {
  const t = page.getByRole('tab', { name });
  if ((await t.count()) === 0) return;
  await t.click();
  await page.waitForTimeout(700);
  await shot(page, label);
}

const SCENARIOS = {
  single: { tickers: ['AAPL'], range: '1Y' },
  multi: { tickers: ['AAPL', 'MSFT', 'NVDA'], range: '1Y' },
  weekly: { tickers: ['NVDA'], range: ['2016-10-28', '2026-10-28'] },
  spy: { tickers: ['TSLA', 'SPY'], range: '1Y' },
  short: { tickers: ['AMZN'], range: ['2026-09-28', '2026-10-28'] },
  max: {
    tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOG', 'AMZN', 'META', 'TSLA', 'JPM', 'XOM', 'BRK-B'],
    range: ['2006-10-28', '2026-10-28'],
  },
};

for (const [name, sc] of Object.entries(SCENARIOS)) {
  for (const width of [1280, 390]) {
    for (const scheme of ['light', 'dark']) {
      const label = `${name}-${width}-${scheme}`;
      if (filter && !filter.test(label)) continue;
      console.log(label);
      const { page, context } = await open({ width, scheme });
      const t0 = Date.now();
      await analyze(page, sc.tickers, sc.range);
      await ready(page);
      console.log(`  ready in ${Date.now() - t0} ms`);
      await shot(page, `${label}`);
      await tab(page, 'Returns', `${label}-returns`);
      await tab(page, 'Risk', `${label}-risk`);
      await tab(page, 'Seasonality', `${label}-seasonality`);
      await tab(page, 'Compare', `${label}-compare`);
      await context.close();
    }
  }
}

// States: empty, loading, error, unreadable response, validation.
for (const scheme of ['light', 'dark']) {
  for (const width of [1280, 390]) {
    const label = `states-${width}-${scheme}`;
    if (filter && !filter.test(label)) continue;
    console.log(label);
    const { page, context } = await open({ width, scheme });
    await shot(page, `${label}-empty`);
    await analyze(page, ['SLOW'], '1Y');
    await page.waitForTimeout(1500);
    await shot(page, `${label}-loading`);
    await page.getByRole('button', { name: /^analyze$/i }).waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Remove SLOW' }).click();
    await analyze(page, ['QXZQZ'], '1Y');
    await page.getByRole('alert').waitFor();
    await shot(page, `${label}-error`);
    await page.getByRole('button', { name: 'Remove QXZQZ' }).click();
    await analyze(page, ['BADJSON'], '1Y');
    await page.getByRole('alert').getByText(/could not read/).waitFor();
    await shot(page, `${label}-unreadable`, false);
    await page.reload();
    await page.getByRole('button', { name: /^analyze$/i }).click();
    await page.waitForTimeout(300);
    await shot(page, `${label}-validation`, false);
    await context.close();
  }
}

await browser.close();
console.log(problems ? `${problems} console problems` : 'no console errors or warnings');
