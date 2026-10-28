import { ChartSpline, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WithTooltip } from '@/components/ui/tooltip';
import type { Theme } from '@/lib/theme';

export function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
          <ChartSpline className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight tracking-tight sm:text-lg">
            Stock Price Analysis
          </h1>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">
            Exploratory data analysis of historical stock prices
          </p>
        </div>
        <WithTooltip label={`Switch to ${next} theme`}>
          <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label={`Switch to ${next} theme`}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </WithTooltip>
      </div>
    </header>
  );
}
