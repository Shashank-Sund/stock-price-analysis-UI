import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import Dashboard from './Dashboard';
import { MULTI, SHORT, SINGLE, WITH_SPY } from '@/test/json-fixtures';
import type { AnalysisResponse } from '@/lib/types';

const q = (tickers: string[]) => ({ startDate: '2025-10-28', endDate: '2026-10-28', tickers });
const renderDash = (data: AnalysisResponse, tickers = data.tickers) =>
  render(
    <TooltipProvider>
      <Dashboard data={data} query={q(tickers)} />
    </TooltipProvider>,
  );

describe('Dashboard summary', () => {
  it('shows KPI cards with hints for one ticker', async () => {
    renderDash(SINGLE);
    expect(screen.getByRole('heading', { name: 'AAPL at a glance' })).toBeInTheDocument();
    expect(screen.getByText('Total return').nextElementSibling).toHaveTextContent('+29.51%');
    expect(screen.getByText('Sharpe (risk-free 0%)')).toBeInTheDocument();
    expect(screen.getByText('The biggest drop from a peak to a later low.')).toBeInTheDocument();
    expect(screen.getByText(/Dec 2, 2025 to Jan 20, 2026, recovered May 6, 2026/)).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(await screen.findByRole('figure', { name: 'AAPL price chart' })).toHaveAccessibleDescription(/AAPL closed at 347\.10/);
  });

  it('shows a table with an SPY row for several tickers', () => {
    renderDash(MULTI);
    const table = screen.getByRole('table', { name: /summary statistics/i });
    const rows = within(table).getAllByRole('row');
    expect(rows.map((r) => within(r).queryByRole('rowheader')?.textContent ?? '')).toEqual([
      '',
      'AAPL',
      'MSFT',
      'NVDA',
      'SPYBenchmark',
    ]);
    expect(within(table).getByRole('button', { name: 'About Sharpe (risk-free 0%)' })).toBeInTheDocument();
  });

  it('switches the price chart between tickers', async () => {
    const user = userEvent.setup();
    renderDash(MULTI);
    expect(screen.getByRole('heading', { name: 'AAPL price' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('group', { name: 'Ticker shown' })).getByRole('button', { name: /MSFT/ }));
    expect(screen.getByRole('heading', { name: 'MSFT price' })).toBeInTheDocument();
    // The table's ticker buttons drive the same selection.
    await user.click(screen.getByRole('button', { name: 'Show NVDA charts' }));
    expect(screen.getByRole('heading', { name: 'NVDA price' })).toBeInTheDocument();
  });

  it('shows SPY once when the user entered it', () => {
    renderDash(WITH_SPY);
    const table = screen.getByRole('table', { name: /summary statistics/i });
    expect(within(table).getAllByText('SPY')).toHaveLength(1);
    expect(within(table).queryByText('Benchmark')).not.toBeInTheDocument();
  });

  it('toggles chart type and moving averages', async () => {
    const user = userEvent.setup();
    renderDash(SHORT);
    const candles = await screen.findByRole('button', { name: 'Candlesticks' });
    expect(screen.getByRole('button', { name: 'Line' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(candles);
    expect(candles).toHaveAttribute('aria-pressed', 'true');
    const sma = screen.getByRole('button', { name: /50 day avg/ });
    await user.click(sma);
    expect(sma).toHaveAttribute('aria-pressed', 'true');
  });
});
