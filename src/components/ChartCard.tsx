import { Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WithTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { figureAspect } from '@/lib/layout';
import type { Chart } from '@/lib/parse';

interface ChartCardProps {
  chart: Chart;
  wide: boolean;
  index: number;
  onOpen: () => void;
  onDownload: () => void;
}

export function ChartCard({ chart, wide, index, onOpen, onDownload }: ChartCardProps) {
  return (
    <Card
      className={cn('animate-enter min-w-0 overflow-hidden', wide && 'lg:col-span-2')}
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
    >
      <div className="flex items-center gap-2 border-b py-2 pr-2 pl-4">
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium" title={chart.title}>
          {chart.title}
        </h3>
        <WithTooltip label="Download PNG">
          <Button variant="ghost" size="icon-sm" onClick={onDownload} aria-label={`Download ${chart.title} as PNG`}>
            <Download />
          </Button>
        </WithTooltip>
        <WithTooltip label="View full screen">
          <Button variant="ghost" size="icon-sm" onClick={onOpen} aria-label={`View ${chart.title} full screen`}>
            <Maximize2 />
          </Button>
        </WithTooltip>
      </div>
      <div className="p-3">
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            'group block w-full cursor-zoom-in overflow-hidden rounded-lg bg-figure ring-1 ring-black/5 outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/60 dark:ring-white/5',
            figureAspect(wide),
          )}
          aria-label={`Open ${chart.title} full screen`}
        >
          <img
            src={chart.src}
            alt={chart.title}
            decoding="async"
            className="size-full object-contain transition-transform duration-300 motion-safe:group-hover:scale-[1.01]"
          />
        </button>
      </div>
    </Card>
  );
}

export function ChartCardSkeleton({ wide }: { wide: boolean }) {
  return (
    <Card className={cn('min-w-0 overflow-hidden', wide && 'lg:col-span-2')}>
      <div className="flex h-[49px] items-center gap-2 border-b py-2 pr-2 pl-4">
        <Skeleton className="h-3.5 w-40" />
        <div className="flex-1" />
        <Skeleton className="size-6" />
        <Skeleton className="size-6" />
      </div>
      <div className="p-3">
        <Skeleton className={cn('w-full rounded-lg', figureAspect(wide))} />
      </div>
    </Card>
  );
}
