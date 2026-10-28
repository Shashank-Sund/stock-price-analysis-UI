import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Chart } from '@/lib/parse';

interface ChartDialogProps {
  charts: Chart[];
  index: number | null;
  subtitle: string;
  onIndexChange: (index: number | null) => void;
  onDownload: (chart: Chart) => void;
}

export function ChartDialog({ charts, index, subtitle, onIndexChange, onDownload }: ChartDialogProps) {
  const chart = index === null ? null : charts[index];
  const many = charts.length > 1;
  const go = (delta: number) => {
    if (index === null) return;
    onIndexChange((index + delta + charts.length) % charts.length);
  };

  return (
    <Dialog open={chart != null} onOpenChange={(open) => !open && onIndexChange(null)}>
      {chart && (
        <DialogContent
          className="max-w-[min(100vw-2rem,80rem)]"
          onKeyDown={(e) => {
            if (!many) return;
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
          }}
        >
          <DialogHeader>
            <DialogTitle>{chart.title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg bg-figure ring-1 ring-black/5 dark:ring-white/5">
            <img
              src={chart.src}
              alt={chart.title}
              className="mx-auto max-h-[calc(100dvh-13rem)] w-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            {many ? (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => go(-1)} aria-label="Previous chart">
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon-sm" onClick={() => go(1)} aria-label="Next chart">
                  <ChevronRight />
                </Button>
                <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                  {(index ?? 0) + 1} of {charts.length}
                </span>
              </div>
            ) : (
              <span />
            )}
            <Button variant="outline" size="sm" onClick={() => onDownload(chart)}>
              <Download />
              Download PNG
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
