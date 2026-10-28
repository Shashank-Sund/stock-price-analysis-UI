import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import Dashboard from './Dashboard';
import { MULTI, SHORT, SINGLE } from '@/test/json-fixtures';
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
});
