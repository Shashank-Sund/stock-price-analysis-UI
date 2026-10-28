import { formatAxisDate } from '@/lib/format';
import { timeTicks, type TimePoint } from '@/lib/transforms';

/** Props for a Recharts XAxis over TimePoint rows (UTC ms in `t`). */
export function timeAxis(rows: TimePoint[], target = 6) {
  const min = rows[0]?.t ?? 0;
  const max = rows[rows.length - 1]?.t ?? 0;
  const spanDays = (max - min) / 86400000;
  return {
    dataKey: 't',
    type: 'number' as const,
    domain: [min, max] as [number, number],
    ticks: timeTicks(min, max, target),
    tickFormatter: (v: number) => formatAxisDate(v, spanDays),
    tickLine: false,
    axisLine: false,
    tickMargin: 8,
    minTickGap: 16,
  };
}

export const yAxisBase = { tickLine: false, axisLine: false, tickMargin: 6, width: 52 };
