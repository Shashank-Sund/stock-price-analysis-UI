import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TickerInput } from './TickerInput';

function Harness({ initial = [] as string[] }) {
  const [tickers, setTickers] = useState<string[]>(initial);
  const [draft, setDraft] = useState('');
  return (
    <>
      <label htmlFor="t">Tickers</label>
      <TickerInput id="t" tickers={tickers} onChange={setTickers} draft={draft} onDraftChange={setDraft} />
      <output data-testid="value">{tickers.join(',')}</output>
    </>
  );
}

const value = () => screen.getByTestId('value').textContent;

describe('TickerInput', () => {
  it('adds an uppercase chip on Enter', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Tickers'), ' aapl {Enter}');
    expect(value()).toBe('AAPL');
    expect(screen.getByText('AAPL', { selector: 'li' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tickers')).toHaveValue('');
  });

  it('adds on comma and dedupes', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Tickers'), 'msft,aapl,MSFT,');
    expect(value()).toBe('MSFT,AAPL');
  });

  it('backspace on an empty field removes the last chip', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['AAPL', 'MSFT']} />);
    await user.click(screen.getByLabelText('Tickers'));
    await user.keyboard('{Backspace}');
    expect(value()).toBe('AAPL');
  });

  it('backspace with text only edits the text', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['AAPL']} />);
    await user.type(screen.getByLabelText('Tickers'), 'GO{Backspace}');
    expect(value()).toBe('AAPL');
    expect(screen.getByLabelText('Tickers')).toHaveValue('G');
  });

  it('splits pasted lists', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['AAPL']} />);
    await user.click(screen.getByLabelText('Tickers'));
    await user.paste('aapl, msft goog');
    expect(value()).toBe('AAPL,MSFT,GOOG');
  });

  it('commits the draft on blur', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Tickers'), 'nvda');
    await user.tab();
    expect(value()).toBe('NVDA');
  });

  it('removes a chip with its button', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['AAPL', 'MSFT']} />);
    await user.click(screen.getByRole('button', { name: 'Remove AAPL' }));
    expect(value()).toBe('MSFT');
  });
});
