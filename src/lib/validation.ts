import { parseISODate, subtractMonths, toISODate } from './dates';
import { isValidTicker } from './tickers';

/** Backend limits (docs/json-api.md). SPY is the benchmark and does not count toward the ticker limit. */
export const MAX_TICKERS = 10;
export const MAX_YEARS = 20;
export const BENCHMARK_SYMBOL = 'SPY';

/** The same calendar date N years later (Feb 29 becomes Feb 28, like pandas DateOffset). */
const addYears = (d: Date, n: number) => subtractMonths(d, -12 * n);

export interface FormValues {
  startDate: string;
  endDate: string;
  tickers: string[];
}

export interface FormErrors {
  startDate?: string;
  endDate?: string;
  tickers?: string;
}

export function validateForm(values: FormValues, today: Date = new Date()): FormErrors {
  const errors: FormErrors = {};
  const todayIso = toISODate(today);
  const start = values.startDate ? parseISODate(values.startDate) : null;
  const end = values.endDate ? parseISODate(values.endDate) : null;

  if (!values.startDate) errors.startDate = 'Choose a start date.';
  else if (!start) errors.startDate = 'Enter a valid start date.';

  if (!values.endDate) errors.endDate = 'Choose an end date.';
  else if (!end) errors.endDate = 'Enter a valid end date.';
  else if (values.endDate > todayIso) errors.endDate = 'End date cannot be in the future.';

  if (start && end && !errors.startDate && values.startDate >= values.endDate) {
    errors.startDate = 'Start date must be before the end date.';
  } else if (start && end && !errors.startDate && values.endDate > toISODate(addYears(start, MAX_YEARS))) {
    errors.startDate = `The date range can be at most ${MAX_YEARS} years.`;
  }

  if (values.tickers.length === 0) {
    errors.tickers = 'Add at least one ticker, for example AAPL.';
  } else {
    const invalid = values.tickers.filter((t) => !isValidTicker(t));
    const counted = values.tickers.filter((t) => t !== BENCHMARK_SYMBOL).length;
    if (invalid.length > 0) {
      errors.tickers = `${invalid.length === 1 ? 'Invalid ticker' : 'Invalid tickers'}: ${invalid.join(', ')}. Use up to 10 letters, digits or . - ^ =`;
    } else if (counted > MAX_TICKERS) {
      // Same message as the backend. SPY is the benchmark and does not count here.
      errors.tickers = `Enter at most ${MAX_TICKERS} tickers.`;
    }
  }
  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Boolean(errors.startDate || errors.endDate || errors.tickers);
}
