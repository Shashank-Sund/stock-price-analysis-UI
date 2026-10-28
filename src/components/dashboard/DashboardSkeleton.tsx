import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** Loading placeholder in the dashboard's shape: summary, price chart, tabs. */
export function DashboardSkeleton({ tickers }: { tickers: number }) {
  const single = tickers <= 1;
  return (
    <div className="flex flex-col gap-6" data-testid="dashboard-skeleton">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        {single ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Card key={i} className="gap-2 p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </Card>
            ))}
          </div>
        ) : (
          <Card className="gap-3 p-4">
            {Array.from({ length: tickers + 2 }, (_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </Card>
        )}
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:px-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-72 max-w-full" />
        </div>
        <div className="p-3">
          <Skeleton className="h-[320px] w-full rounded-lg sm:h-[400px]" />
        </div>
      </Card>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-80 max-w-full" />
        <Card className="p-4">
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </Card>
      </div>
    </div>
  );
}
