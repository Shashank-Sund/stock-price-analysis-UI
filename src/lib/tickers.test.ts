import { describe, expect, it } from 'vitest';
import { addTickers, splitTickers } from './tickers';

describe('ticker helpers', () => {
  it('splits, trims and uppercases', () => {
    expect(splitTickers(' aapl, msft  goog,,')).toEqual(['AAPL', 'MSFT', 'GOOG']);
  });
  it('dedupes while keeping order', () => {
    expect(addTickers(['AAPL'], ['msft', 'AAPL', ' msft '])).toEqual(['AAPL', 'MSFT']);
  });
});
