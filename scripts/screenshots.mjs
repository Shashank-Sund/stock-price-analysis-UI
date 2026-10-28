#!/usr/bin/env node
/**
 * Captures UI screenshots of a running preview build against the mock API.
 *
 *   VITE_API_URL=http://localhost:8787 npm run build
 *   npm run mock-api &   npm run preview &
 *   npm run screenshots -- [outDir]
 *
 * Uses playwright-core with the locally installed Google Chrome (channel "chrome").
 * Set CHROME_PATH to use a different Chromium binary. APP_URL defaults to http://localhost:4173.
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const APP_URL = process.env.APP_URL ?? 'http://localhost:4173';
const outDir = resolve(process.argv[2] ?? 'screenshots');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' },
);

async function newPage({ width = 1280, height = 900, scheme = 'light', reducedMotion = 'reduce' } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: scheme,
    reducedMotion,
  });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && console.log(`[console] ${m.text()}`));
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await page.goto(APP_URL);
  return { page, context };
}

const shot = async (page, name, fullPage = true) => {
  const path = join(outDir, `${name}.png`);
  await page.screenshot({ path, fullPage });
  console.log(`saved ${path}`);
};

async function analyze(page, tickers, preset = '1Y') {
  await page.getByRole('button', { name: preset, exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Tickers' });
  for (const t of tickers) {
    await input.fill(t);
    await input.press('Enter');
  }
  await page.getByRole('button', { name: /^analyze$/i }).click();
}

// 1. Empty state.
{
  const { page, context } = await newPage();
  await shot(page, '01-empty');
  // 2. Loading (SLOW takes 5 s).
  await analyze(page, ['SLOW']);
  await page.waitForTimeout(2200);
  await shot(page, '02-loading');
  await page.getByRole('button', { name: /^analyze$/i }).waitFor({ timeout: 15000 });
  await context.close();
}

// 3. Single ticker result.
{
  const { page, context } = await newPage();
  await analyze(page, ['AAPL']);
  await page.getByRole('img', { name: 'Daily Returns' }).waitFor();
  await page.waitForTimeout(300);
  await shot(page, '03-single');
  // Full screen dialog.
  await page.getByRole('button', { name: 'Open Correlation Between Stock Prices full screen' }).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(300);
  await shot(page, '03b-dialog', false);
  await context.close();
}

// 4. Multiple tickers.
{
  const { page, context } = await newPage();
  await analyze(page, ['AAPL', 'MSFT', 'GOOG']);
  await page.getByRole('img', { name: /Multiple Companies/ }).waitFor();
  await page.waitForTimeout(300);
  await shot(page, '04-multi');
  await context.close();
}

// 5. Errors: eda-error, then old crash JSON.
{
  const { page, context } = await newPage();
  await analyze(page, ['ERR']);
  await page.getByRole('alert').waitFor();
  await shot(page, '05-error');
  await page.getByRole('button', { name: 'Remove ERR' }).click();
  await analyze(page, ['CRASH']);
  await page.getByText(/analysis service failed/i).first().waitFor();
  await shot(page, '05b-error-crash');
  // Validation errors.
  await page.reload();
  await page.getByRole('button', { name: /^analyze$/i }).click();
  await page.waitForTimeout(400);
  await shot(page, '05c-validation');
  await context.close();
}

// 6. Dark mode: empty and single result.
{
  const { page, context } = await newPage({ scheme: 'dark' });
  await shot(page, '06-dark-empty');
  await analyze(page, ['AAPL']);
  await page.getByRole('img', { name: 'Daily Returns' }).waitFor();
  await page.waitForTimeout(300);
  await shot(page, '06-dark-single');
  await analyze(page, ['ERR']);
  await page.getByRole('alert').waitFor();
  await shot(page, '06-dark-error');
  await context.close();
}

// 7. Mobile width 390 px: empty with recent chips, then a result.
{
  const { page, context } = await newPage({ width: 390, height: 844 });
  await analyze(page, ['AAPL']);
  await page.getByRole('img', { name: 'Daily Returns' }).waitFor();
  await page.getByRole('button', { name: 'Remove AAPL' }).click();
  await analyze(page, ['MSFT', 'NVDA'], '6M');
  await page.getByRole('img', { name: /Multiple Companies/ }).waitFor();
  await page.waitForTimeout(300);
  await shot(page, '07-mobile');
  const { page: p2, context: c2 } = await newPage({ width: 390, height: 844, scheme: 'dark' });
  await analyze(p2, ['SLOW']);
  await p2.waitForTimeout(1500);
  await shot(p2, '07b-mobile-dark-loading');
  await c2.close();
  await context.close();
}

await browser.close();
