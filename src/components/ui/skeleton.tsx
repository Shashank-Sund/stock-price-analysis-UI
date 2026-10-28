// Adapted from shadcn/ui (MIT, https://github.com/shadcn-ui/ui).
// Pulses only when motion is allowed; otherwise a static fill.
import * as React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('rounded-md bg-muted motion-safe:animate-pulse dark:bg-secondary', className)}
      {...props}
    />
  );
}
