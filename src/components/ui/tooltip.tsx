// Adapted from shadcn/ui (MIT, https://github.com/shadcn-ui/ui), built on Radix UI Tooltip (MIT).
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'tooltip-content z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

/** Convenience wrapper: icon button plus a text tooltip. */
export function WithTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
