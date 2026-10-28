// Adapted from the shadcn/ui chart component (MIT, https://github.com/shadcn-ui/ui),
// reworked for Recharts 3 and this site's tokens. A ChartConfig maps series keys to a
// label and a color; ChartContainer exposes the colors as --color-<key> custom
// properties and styles Recharts' axes, grid and tooltip cursor with the theme tokens,
// so charts follow light and dark mode without JavaScript.
import * as React from 'react';
import * as Recharts from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<string, { label: React.ReactNode; color?: string; dashed?: boolean }>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

export function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used inside <ChartContainer>');
  return ctx;
}

const safeKey = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '_');

/** CSS custom property name for a config key, e.g. var(--color-BRK-B). */
export const colorVar = (key: string) => `var(--color-${safeKey(key)})`;

export function ChartContainer({
  config,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ReactElement;
}) {
  const style = React.useMemo(() => {
    const s: Record<string, string> = {};
    for (const [k, v] of Object.entries(config)) if (v.color) s[`--color-${safeKey(k)}`] = v.color;
    return s as React.CSSProperties;
  }, [config]);
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        style={style}
        className={cn(
          'relative w-full text-xs',
          '[&_.recharts-cartesian-axis-tick_text]:fill-[var(--chart-axis)] [&_.recharts-cartesian-axis-tick_text]:tabular-nums',
          '[&_.recharts-cartesian-grid_line]:stroke-[var(--chart-grid)]',
          '[&_.recharts-cartesian-axis-line]:stroke-[var(--border)] [&_.recharts-cartesian-axis-tick-line]:stroke-[var(--border)]',
          '[&_.recharts-reference-line_line]:stroke-[var(--chart-axis)]',
          '[&_.recharts-tooltip-cursor]:stroke-[var(--chart-axis)] [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[var(--muted)] [&_.recharts-rectangle.recharts-tooltip-cursor]:stroke-none',
          '[&_.recharts-dot]:stroke-[var(--card)] [&_.recharts-active-dot_circle]:stroke-[var(--card)]',
          '[&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none',
          className,
        )}
        {...props}
      >
        <Recharts.ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 300 }}>
          {children}
        </Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = Recharts.Tooltip;

type ItemFormatter = (value: number | null, key: string) => React.ReactNode;

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  hideIndicator = false,
  sort = false,
  footer,
}: Partial<TooltipContentProps<number, string>> & {
  labelFormatter?: (label: unknown, payload: readonly { payload?: unknown }[]) => React.ReactNode;
  formatter?: ItemFormatter;
  hideIndicator?: boolean;
  /** Sort rows by value, highest first. */
  sort?: boolean;
  footer?: (payload: readonly { payload?: unknown }[]) => React.ReactNode;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.type !== 'none' && config[String(p.dataKey)]);
  const ordered = sort ? [...rows].sort((a, b) => (Number(b.value) || -Infinity) - (Number(a.value) || -Infinity)) : rows;
  return (
    <div className="grid min-w-36 gap-1.5 rounded-lg border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-md backdrop-blur-sm">
      {label !== undefined && <div className="font-medium">{labelFormatter ? labelFormatter(label, payload) : String(label)}</div>}
      <div className="grid gap-1">
        {ordered.map((p) => {
          const key = String(p.dataKey);
          const c = config[key];
          const value = typeof p.value === 'number' ? p.value : null;
          return (
            <div key={key} className="flex items-center gap-2">
              {!hideIndicator && (
                <span
                  aria-hidden="true"
                  className={cn('h-0 w-3 shrink-0 border-t-[2.5px]', c.dashed && 'border-dashed')}
                  style={{ borderColor: c.color ? colorVar(key) : (p.color as string) }}
                />
              )}
              <span className="text-muted-foreground">{c.label}</span>
              <span className="ml-auto pl-3 font-medium tabular-nums">{formatter ? formatter(value, key) : String(p.value)}</span>
            </div>
          );
        })}
      </div>
      {footer?.(payload)}
    </div>
  );
}

/** HTML legend for a chart; entries are buttons when onToggle is given (show or hide a series). */
export function ChartLegend({
  keys,
  hidden,
  onToggle,
  className,
}: {
  keys: string[];
  hidden?: Set<string>;
  onToggle?: (key: string) => void;
  className?: string;
}) {
  const { config } = useChart();
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs', className)} aria-label="Legend">
      {keys.map((k) => {
        const c = config[k];
        const off = hidden?.has(k) ?? false;
        const key = (
          <span
            aria-hidden="true"
            className={cn('h-0 w-3.5 shrink-0 border-t-[2.5px]', c.dashed && 'border-dashed')}
            style={{ borderColor: colorVar(k) }}
          />
        );
        return (
          <li key={k}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => onToggle(k)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-0.5 font-mono outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
                  off ? 'text-muted-foreground/60 line-through' : 'text-foreground',
                )}
              >
                {key}
                {c.label}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                {key}
                {c.label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
