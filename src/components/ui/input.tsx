// Adapted from shadcn/ui (MIT, https://github.com/shadcn-ui/ui).
import * as React from 'react';
import { cn } from '@/lib/utils';

/** Shared field chrome so composite controls (like the ticker chip input) match plain inputs. */
export const fieldClasses =
  'w-full min-w-0 rounded-md border border-input bg-card shadow-xs transition-[border-color,box-shadow] outline-none dark:bg-input/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-60';

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClasses,
        'h-9 px-3 py-1 text-base tabular-nums placeholder:text-muted-foreground md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn('text-sm font-medium leading-none text-foreground select-none', className)}
      {...props}
    />
  );
}
