// Adapted from shadcn/ui (MIT, https://github.com/shadcn-ui/ui), built on Radix UI Tabs (MIT):
// arrow keys move between tabs, Home and End jump, Tab moves into the panel.
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex h-9 w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-[3px] text-muted-foreground', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-full items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs dark:data-[state=active]:bg-input/40 [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 rounded-xl', className)} {...props} />;
}
