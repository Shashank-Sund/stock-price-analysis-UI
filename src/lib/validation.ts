import { parseISODate, toISODate } from './dates';
import { isValidTicker } from './tickers';

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
  }

  if (values.tickers.length === 0) {
    errors.tickers = 'Add at least one ticker, for example AAPL.';
  } else {
    const invalid = values.tickers.filter((t) => !isValidTicker(t));
    if (invalid.length > 0) {
      errors.tickers = `${invalid.length === 1 ? 'Invalid ticker' : 'Invalid tickers'}: ${invalid.join(', ')}. Use up to 10 letters, digits or . - ^ =`;
    }
  }
  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Boolean(errors.startDate || errors.endDate || errors.tickers);
}
