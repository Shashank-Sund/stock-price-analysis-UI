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

// Charts: Lightweight Charts needs a real canvas, so tests use a recording stand in.
vi.mock('lightweight-charts', () => import('./lightweight-charts-mock'));

// jsdom has no layout: give ResizeObserver a no-op and charts a fixed size.
if (!('ResizeObserver' in window)) {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', { writable: true, value: RO });
  Object.defineProperty(globalThis, 'ResizeObserver', { writable: true, value: RO });
}

// jsdom prints "not implemented" for canvas; color resolution falls back without it.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];

// jsdom has no layout, so Recharts' ResponsiveContainer measures 0 x 0 and warns; that is expected here.
const warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith('The width(0) and height(0) of chart')) return;
  warn(...args);
};
