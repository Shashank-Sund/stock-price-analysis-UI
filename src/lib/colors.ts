/**
 * Resolves CSS colors (including var(--token) and oklch()) to rgba() strings for canvas
 * based charts, which cannot read custom properties. Uses a 1x1 canvas so any color the
 * browser understands works. Falls back to the input when canvas is unavailable.
 */
let ctx: CanvasRenderingContext2D | null | undefined;

function context(): CanvasRenderingContext2D | null {
  if (ctx === undefined) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      ctx = canvas.getContext('2d', { willReadFrequently: true });
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

export function readCssVar(name: string, el: Element = document.documentElement): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/** "var(--series-1)" or "#2a78d6" or "oklch(...)" to "rgba(r, g, b, a)". */
export function resolveColor(color: string, fallback = '#888888'): string {
  const m = /^var\((--[\w-]+)\)$/.exec(color.trim());
  const value = m ? readCssVar(m[1]) : color;
  if (!value) return fallback;
  const c = context();
  if (!c) return value;
  c.clearRect(0, 0, 1, 1);
  c.fillStyle = '#000000';
  c.fillStyle = value;
  c.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;
}

/** Same color with a new alpha. */
export function withAlpha(rgba: string, alpha: number): string {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgba);
  return m ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})` : rgba;
}
