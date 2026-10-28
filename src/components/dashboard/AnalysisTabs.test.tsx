import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import Dashboard from './Dashboard';
import { MAX, MULTI, SHORT, SINGLE, WITH_SPY } from '@/test/json-fixtures';
import type { AnalysisResponse } from '@/lib/types';

const renderDash = (data: AnalysisResponse) =>
  render(
    <TooltipProvider>
      <Dashboard data={data} query={{ startDate: data.start_date, endDate: data.end_date, tickers: data.tickers }} />
    </TooltipProvider>,
  );

describe('Analysis tabs', () => {
  it('opens on Returns with the histogram and the statistics table', async () => {
    renderDash(SINGLE);
    expect(screen.getByRole('tab', { name: 'Returns' })).toHaveAttribute('aria-selected', 'true');
    const fig = await screen.findByRole('figure', { name: 'Histogram of AAPL daily returns' });
    expect(fig).toHaveAccessibleDescription(/On 95% of days the return was better than -2\.01%/);
    const stats = screen.getByRole('table', { name: 'AAPL daily return statistics' });
    expect(within(stats).getByRole('rowheader', { name: /Excess kurtosis/ })).toBeInTheDocument();
    expect(within(stats).getByText('52.8%')).toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup();
    renderDash(SINGLE);
    await user.click(screen.getByRole('tab', { name: 'Returns' }));
    await user.keyboard('{ArrowRight}');
    const risk = screen.getByRole('tab', { name: 'Risk' });
    expect(risk).toHaveFocus();
    expect(risk).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('figure', { name: 'AAPL drawdown chart' })).toHaveAccessibleDescription(
      /deepest drawdown was -13\.80%, from the peak on Dec 2, 2025 to the low on Jan 20, 2026\. It got back to the peak on May 6, 2026/,
    );
    expect(screen.getByRole('figure', { name: 'AAPL rolling 30 day volatility' })).toBeInTheDocument();
  });

  it('follows the ticker switcher for several tickers', async () => {
    const user = userEvent.setup();
    renderDash(MULTI);
    await screen.findByRole('figure', { name: 'Histogram of AAPL daily returns' });
    await user.click(within(screen.getByRole('group', { name: 'Ticker shown in this tab' })).getByRole('button', { name: /NVDA/ }));
    expect(await screen.findByRole('figure', { name: 'Histogram of NVDA daily returns' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'NVDA price' })).toBeInTheDocument();
  });

  it('toggles the normal curve', async () => {
    const user = userEvent.setup();
    renderDash(SHORT);
    const toggle = await screen.findByRole('button', { name: /Normal curve/ });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the seasonality heatmap with partial months marked', async () => {
    const user = userEvent.setup();
    renderDash(SINGLE);
    await user.click(screen.getByRole('tab', { name: 'Seasonality' }));
    const table = await screen.findByRole('table', { name: 'AAPL monthly returns by year' });
    const rows = within(table).getAllByRole('row');
    expect(rows.map((r) => within(r).queryByRole('rowheader')?.textContent)).toEqual([undefined, '2025', '2026']);
    expect(within(rows[1]).getByTitle('October 2025: +0.51% (partial month)')).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: 'AAPL average return by month' })).toHaveAccessibleDescription(/strongest month/);
  });

  it('explains when there are no full months', async () => {
    const user = userEvent.setup();
    renderDash(SHORT);
    await user.click(screen.getByRole('tab', { name: 'Seasonality' }));
    expect(await screen.findByText('Needs at least one full calendar month in the range.')).toBeInTheDocument();
  });

  it('compares one ticker with SPY', async () => {
    const user = userEvent.setup();
    renderDash(SINGLE);
    await user.click(screen.getByRole('tab', { name: 'Compare' }));
    expect(await screen.findByText('AAPL and SPY, the benchmark')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Ticker shown in this tab' })).not.toBeInTheDocument();
    const legend = await screen.findByRole('list', { name: 'Legend' });
    expect(within(legend).getAllByRole('button').map((b) => b.textContent)).toEqual(['AAPL', 'SPY (benchmark)']);
    const matrix = screen.getByRole('table', { name: /Correlation of daily returns/ });
    expect(within(matrix).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('figure', { name: /Percent change since the start/ })).toHaveAccessibleDescription(
      'AAPL returned +29.5%. SPY, the benchmark, returned +13.2%.',
    );
  });

  it('lists SPY once when the user entered it, and hides lines from the legend', async () => {
    const user = userEvent.setup();
    renderDash(WITH_SPY);
    await user.click(screen.getByRole('tab', { name: 'Compare' }));
    const legend = await screen.findByRole('list', { name: 'Legend' });
    const buttons = within(legend).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['TSLA', 'SPY (benchmark)']);
    await user.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('handles 10 tickers over 20 years', async () => {
    const user = userEvent.setup();
    renderDash(MAX);
    await user.click(screen.getByRole('tab', { name: 'Compare' }));
    const matrix = await screen.findByRole('table', { name: /Correlation of daily returns/ });
    expect(within(matrix).getAllByRole('row')).toHaveLength(12);
    // Large gains start on a log axis.
    const logButtons = screen.getAllByRole('button', { name: 'Log scale' });
    expect(logButtons[0]).toHaveAttribute('aria-pressed', 'false'); // price chart
    expect(logButtons[1]).toHaveAttribute('aria-pressed', 'true'); // change since the start
    expect(screen.getByRole('figure', { name: /Percent change/ })).toHaveAccessibleDescription(/NVDA gained the most \(\+43,525\.0%\) and XOM the least/);
  });
});
