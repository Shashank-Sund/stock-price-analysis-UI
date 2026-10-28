/** Minimal stand in for lightweight-charts in jsdom (no canvas). Records calls for assertions. */
import { vi } from 'vitest';

export const calls = { created: 0, series: [] as { type: string; data: unknown[]; options: Record<string, unknown> }[] };

function fakeSeries(type: string, options: Record<string, unknown> = {}) {
  const entry = { type, data: [] as unknown[], options: { ...options } };
  calls.series.push(entry);
  return {
    setData: (d: unknown[]) => {
      entry.data = d;
    },
    applyOptions: (o: Record<string, unknown>) => Object.assign(entry.options, o),
  };
}

export const createChart = vi.fn(() => {
  calls.created++;
  return {
    addSeries: (def: { type: string }, options?: Record<string, unknown>) => fakeSeries(def.type, options),
    panes: () => [{ setStretchFactor: () => {} }, { setStretchFactor: () => {} }],
    timeScale: () => ({ fitContent: () => {} }),
    priceScale: () => ({ applyOptions: () => {} }),
    subscribeCrosshairMove: () => {},
    unsubscribeCrosshairMove: () => {},
    applyOptions: () => {},
    remove: () => {},
  };
});

export const LineSeries = { type: 'Line' };
export const CandlestickSeries = { type: 'Candlestick' };
export const HistogramSeries = { type: 'Histogram' };
export const ColorType = { Solid: 'solid' };
export const CrosshairMode = { Normal: 0, Magnet: 1 };
export const PriceScaleMode = { Normal: 0, Logarithmic: 1 };
export const LineStyle = { Solid: 0, Dotted: 1, Dashed: 2 };
