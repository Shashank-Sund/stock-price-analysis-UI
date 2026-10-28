/** Date helpers. All dates are local calendar dates formatted as YYYY-MM-DD. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
    return null;
  }
  return d;
}

/** Subtracts whole months, clamping to the last day of the target month (Mar 31 minus 1M is Feb 28/29). */
export function subtractMonths(d: Date, months: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() - months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return target;
}

export const PRESETS = [
  { id: '1M', label: '1M', description: 'Last month' },
  { id: '6M', label: '6M', description: 'Last 6 months' },
  { id: 'YTD', label: 'YTD', description: 'Year to date' },
  { id: '1Y', label: '1Y', description: 'Last year' },
  { id: '5Y', label: '5Y', description: 'Last 5 years' },
] as const;

export type PresetId = (typeof PRESETS)[number]['id'];

export function presetRange(id: PresetId, today: Date = new Date()): { startDate: string; endDate: string } {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start: Date;
  switch (id) {
    case '1M':
      start = subtractMonths(end, 1);
      break;
    case '6M':
      start = subtractMonths(end, 6);
      break;
    case 'YTD':
      start = new Date(end.getFullYear(), 0, 1);
      // On January 1 the range would be empty; fall back to the last day of the previous year.
      if (start.getTime() === end.getTime()) start = new Date(end.getFullYear() - 1, 11, 31);
      break;
    case '1Y':
      start = subtractMonths(end, 12);
      break;
    case '5Y':
      start = subtractMonths(end, 60);
      break;
  }
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

export function matchPreset(startDate: string, endDate: string, today: Date = new Date()): PresetId | null {
  for (const p of PRESETS) {
    const r = presetRange(p.id, today);
    if (r.startDate === startDate && r.endDate === endDate) return p.id;
  }
  return null;
}

const displayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function formatDisplayDate(iso: string): string {
  const d = parseISODate(iso);
  return d ? displayFormat.format(d) : iso;
}
