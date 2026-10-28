import { useId, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** A chart card: title, optional description and actions, the figure, and a text summary. */
export function Panel({
  title,
  description,
  actions,
  summary,
  children,
  className,
  label,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Plain text description of what the chart shows (also the figure's accessible description). */
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Accessible name of the figure. */
  label: string;
}) {
  const id = useId();
  return (
    <Card className={cn('min-w-0 overflow-hidden', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <figure className="m-0 flex min-w-0 flex-col gap-2 px-2 pt-3 pb-4 sm:px-3" aria-label={label} aria-describedby={summary ? id : undefined}>
        {children}
        {summary && (
          <figcaption id={id} className="px-2 text-xs leading-relaxed text-muted-foreground">
            {summary}
          </figcaption>
        )}
      </figure>
    </Card>
  );
}
