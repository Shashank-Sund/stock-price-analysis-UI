import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { RECENT_KEY } from '@/lib/recent';
import { presetRange } from '@/lib/dates';
import { CRASH_JSON, EDA_ERROR, MULTI_NEW, SINGLE_NEW } from '@/test/fixtures/responses';

type Deferred = { resolve: (r: Response) => void; reject: (e: unknown) => void };

function mockFetchWith(body: string, status = 200) {
  const fn = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

function mockFetchDeferred() {
  const pending: Deferred[] = [];
  const fn = vi.fn(
    () =>
      new Promise<Response>((resolve, reject) => {
        pending.push({ resolve, reject });
      }),
  );
  vi.stubGlobal('fetch', fn);
  return { fn, pending };
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, tickers = 'AAPL') {
  await user.click(screen.getByRole('button', { name: '1Y' }));
  await user.type(screen.getByLabelText('Tickers'), `${tickers}{Enter}`);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the header, description, form and footer links', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Stock Price Analysis' })).toBeInTheDocument();
    expect(screen.getByText('No charts yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Front-End Code' })).toHaveAttribute(
      'href',
      'https://github.com/Shashank-Sund/stock-price-analysis-UI',
    );
    expect(screen.getByRole('link', { name: 'Back-End Code' })).toHaveAttribute(
      'href',
      'https://github.com/Shashank-Sund/docker-lambda-aws3',
    );
    expect(screen.getByText('A Shashank Sundararaman Production')).toBeInTheDocument();
  });

  it('shows validation errors and does not call the API', async () => {
    const fetchFn = mockFetchWith(SINGLE_NEW);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    expect(screen.getByText('Choose a start date.')).toBeInTheDocument();
    expect(screen.getByText('Choose an end date.')).toBeInTheDocument();
    expect(screen.getByText(/add at least one ticker/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Start date')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('presets fill the dates and mark the active preset', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '6M' }));
    const r = presetRange('6M');
    expect(screen.getByLabelText('Start date')).toHaveValue(r.startDate);
    expect(screen.getByLabelText('End date')).toHaveValue(r.endDate);
    expect(screen.getByRole('button', { name: '6M' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables the button with a spinner and skeletons until the request finishes', async () => {
    const { fn, pending } = mockFetchDeferred();
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /analyze/i }));

    const button = screen.getByRole('button', { name: /analyzing/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/0s/);
    expect(screen.getByTestId('chart-skeletons').children).toHaveLength(5);
    expect(fn).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual({ ...presetRangeBody('1Y'), symbol: 'AAPL' });

    // Still disabled after more than the old fixed 5 s re-enable timer would have allowed.
    await waitFor(() => expect(button).toHaveTextContent(/[1-9]s/), { timeout: 2500 });
    expect(button).toBeDisabled();

    pending[0].resolve(new Response(SINGLE_NEW, { status: 200 }));
    expect(await screen.findByRole('button', { name: /^analyze$/i })).toBeEnabled();
    expect(screen.getAllByRole('img')).toHaveLength(5);
    expect(screen.getByRole('heading', { level: 3, name: 'Closing Stock Price Over Time' })).toBeInTheDocument();
  });

  it('sends multiple tickers comma joined and shows one chart', async () => {
    const fetchFn = mockFetchWith(MULTI_NEW);
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user, 'aapl, msft');
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    expect(await screen.findByText('Closing Stock Price of Multiple Companies Over Time')).toBeInTheDocument();
    const body = JSON.parse((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.symbol).toBe('AAPL,MSFT');
    expect(screen.getByText('1 chart')).toBeInTheDocument();
  });

  it('includes a ticker that is still being typed when submitting', async () => {
    const fetchFn = mockFetchWith(SINGLE_NEW);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '1M' }));
    await user.type(screen.getByLabelText('Tickers'), 'tsla');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    await screen.findAllByRole('img');
    expect(JSON.parse((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).symbol).toBe('TSLA');
  });

  it('shows eda-error messages in an alert', async () => {
    mockFetchWith(EDA_ERROR);
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user, 'XYZ');
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Analysis failed')).toBeInTheDocument();
    expect(within(alert).getByText('No data found for XYZ between 2024-01-01 and 2024-02-01')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^analyze$/i })).toBeEnabled();
  });

  it('shows the crash JSON gracefully and can retry', async () => {
    const fetchFn = mockFetchWith(CRASH_JSON);
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    expect(within(await screen.findByRole('alert')).getByText(/The analysis service failed/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
  });

  it('shows a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    expect(within(await screen.findByRole('alert')).getByText(/could not reach the analysis service/i)).toBeInTheDocument();
  });

  it('saves successful searches and reruns them from the recent chips', async () => {
    const fetchFn = mockFetchWith(SINGLE_NEW);
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user, 'NVDA');
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    await screen.findAllByRole('img');

    const stored = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].tickers).toEqual(['NVDA']);

    // Change the form, then rerun from the chip.
    await user.click(screen.getByRole('button', { name: 'Remove NVDA' }));
    await user.click(screen.getByRole('button', { name: /^rerun nvda/i }));
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    expect(screen.getByText('NVDA', { selector: 'li' })).toBeInTheDocument();
  });

  it('loads recent searches from storage and can clear them', async () => {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([{ startDate: '2024-01-01', endDate: '2024-06-30', tickers: ['AAPL', 'MSFT'] }]),
    );
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('button', { name: /rerun aapl, msft/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('button', { name: /rerun/i })).not.toBeInTheDocument();
  });

  it('does not save failed searches', async () => {
    mockFetchWith(EDA_ERROR);
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    await screen.findByRole('alert');
    expect(localStorage.getItem(RECENT_KEY)).toBeNull();
  });

  it('opens a chart full screen in a dialog', async () => {
    mockFetchWith(SINGLE_NEW);
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    await user.click(await screen.findByRole('button', { name: 'Open Daily Returns full screen' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Daily Returns' })).toBeInTheDocument();
    expect(within(dialog).getByText('5 of 5')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Next chart' }));
    expect(within(dialog).getByRole('heading', { name: 'Closing Stock Price Over Time' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('downloads a chart as a PNG with a descriptive filename', async () => {
    mockFetchWith(SINGLE_NEW);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('AAPL_closing-stock-price-over-time.png');
    });
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    await user.click(await screen.findByRole('button', { name: 'Download Closing Stock Price Over Time as PNG' }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('toggles the theme and remembers the choice', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement).not.toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('spa.theme')).toBe('dark');
  });
});

function presetRangeBody(id: '1Y') {
  const r = presetRange(id);
  return { start_date: r.startDate, end_date: r.endDate };
}
