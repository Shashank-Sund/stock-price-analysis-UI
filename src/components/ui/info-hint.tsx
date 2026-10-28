// Small "i" button that explains a metric. Opens on hover and focus like any tooltip,
// and also toggles on click or tap, so it works on touch screens.
import * as React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function InfoHint({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`About ${label}`}
          onClick={(e) => {
            // Keep Radix from closing the tooltip on click; toggle it instead.
            e.preventDefault();
            setOpen((o) => !o);
          }}
          className={cn(
            'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/80 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
            className,
          )}
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-pretty font-normal leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
