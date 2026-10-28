import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// jsdom lacks matchMedia; default to a light system theme.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom lacks object URLs (used by chart downloads).
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock';
  URL.revokeObjectURL = () => {};
}
