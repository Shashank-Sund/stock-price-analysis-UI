import type { DashboardView } from '@/lib/dashboard';
import { SeriesKey, ToggleButton } from './parts';

/** Picks the ticker that the price chart and the Returns, Risk and Seasonality tabs show. */
export function TickerSwitcher({ view, active, onChange, label = 'Ticker shown' }: { view: DashboardView; active: string; onChange: (t: string) => void; label?: string }) {
  if (view.tickers.length < 2) return null;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {view.tickers.map((t) => (
        <ToggleButton key={t} pressed={t === active} onClick={() => onChange(t)} className="font-mono">
          <SeriesKey style={view.styles[t]} />
          {t}
        </ToggleButton>
      ))}
    </div>
  );
}
