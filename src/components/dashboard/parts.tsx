/** Small presentational pieces shared across the dashboard. */
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SeriesStyle } from '@/lib/dashboard';
import { formatSignedPercent, sign } from '@/lib/format';
import type { Num } from '@/lib/types';

/** A short line in the series color: solid, or dashed for the benchmark and tickers 9 and 10. */
export function SeriesKey({ style, className }: { style: SeriesStyle; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-0 w-3.5 shrink-0 border-t-[2.5px]', style.dashed && 'border-dashed', className)}
      style={{ borderColor: style.color }}
    />
  );
}

/** Signed percentage, colored by direction, with an arrow (the sign carries the meaning too). */
export function Change({ value, digits = 2, arrow = false, className }: { value: Num; digits?: number; arrow?: boolean; className?: string }) {
  const s = sign(value);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 whitespace-nowrap',
        s > 0 && 'text-positive',
        s < 0 && 'text-negative',
        className,
      )}
    >
      {arrow && s > 0 && <ArrowUpRight className="size-[0.9em] shrink-0" aria-hidden="true" />}
      {arrow && s < 0 && <ArrowDownRight className="size-[0.9em] shrink-0" aria-hidden="true" />}
      {formatSignedPercent(value, digits)}
    </span>
  );
}

export function SectionHeading({ title, description, actions, id }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h3 id={id} className="text-base font-semibold leading-tight tracking-tight">
          {title}
        </h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Pressed state toggle button, styled like the form's preset buttons. */
export function ToggleButton({
  pressed,
  onClick,
  children,
  className,
  ...rest
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-card px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground shadow-xs transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/20 dark:hover:bg-input/40',
        pressed &&
          'border-primary/40 bg-accent text-accent-foreground hover:bg-accent dark:border-primary/50 dark:bg-accent dark:hover:bg-accent',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
