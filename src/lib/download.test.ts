import { describe, expect, it } from 'vitest';
import { chartFilename, slugify } from './download';

describe('download filenames', () => {
  it('builds TICKER_slug.png', () => {
    expect(chartFilename(['AAPL'], 'Closing Stock Price Over Time')).toBe('AAPL_closing-stock-price-over-time.png');
  });
  it('joins multiple tickers', () => {
    expect(chartFilename(['AAPL', 'MSFT'], 'Closing Stock Price of Multiple Companies Over Time')).toBe(
      'AAPL-MSFT_closing-stock-price-of-multiple-companies-over-time.png',
    );
  });
  it('handles odd titles', () => {
    expect(slugify('  Chart 1!!  ')).toBe('chart-1');
    expect(slugify('***')).toBe('chart');
  });
});
