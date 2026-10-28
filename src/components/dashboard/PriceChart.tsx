/**
 * Main price chart, drawn with TradingView Lightweight Charts (Apache 2.0; attribution
 * link in the footer). Line by default, candlesticks on request, optional 50 and 200
 * day moving averages, volume in a pane underneath, zoom and pan, and a crosshair
 * tooltip. Colors come from the site's CSS tokens and follow the theme.
 */
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  PriceScaleMode,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useIsDark, useReducedMotion } from '@/hooks/useMedia';
import { resolveColor, withAlpha } from '@/lib/colors';
import type { SeriesStyle } from '@/lib/dashboard';
import { buildPriceRows, type PriceRow } from '@/lib/transforms';
import { formatCompact, formatDate, formatPrice } from '@/lib/format';
import type { Interval, TickerData } from '@/lib/types';

export type PriceMode = 'line' | 'candles';

export interface PriceChartHandle {
  resetZoom: () => void;
}

export interface PriceChartProps {
  series: TickerData;
  style: SeriesStyle;
  interval: Interval;
  mode: PriceMode;
  showSma50: boolean;
  showSma200: boolean;
  logScale?: boolean;
  ref?: Ref<PriceChartHandle>;
}

interface Hover {
  row: PriceRow;
  x: number;
}

interface SeriesRefs {
  line: ISeriesApi<'Line'>;
  candles: ISeriesApi<'Candlestick'>;
  sma50: ISeriesApi<'Line'>;
  sma200: ISeriesApi<'Line'>;
  volume: ISeriesApi<'Histogram'>;
}

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export default function PriceChart({ series, style, interval, mode, showSma50, showSma200, logScale = false, ref }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<SeriesRefs | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [width, setWidth] = useState(0);
  const isDark = useIsDark();
  const reducedMotion = useReducedMotion();
  const rows = useMemo(() => buildPriceRows(series.prices), [series]);

  useImperativeHandle(ref, () => ({ resetZoom: () => chartRef.current?.timeScale().fitContent() }), []);

  // Create the chart and load data once per series.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        fontFamily: FONT,
        fontSize: 12,
        attributionLogo: false,
        panes: { enableResize: false },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { scaleMargins: { top: 0.08, bottom: 0.06 } },
      timeScale: {
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 0,
        borderVisible: true,
        // Years and months only; a lone day number ("23") reads like a value.
        tickMarkFormatter: (t: number, type: TickMarkType) => {
          const d = new Date(t * 1000);
          if (type === TickMarkType.Year) return String(d.getUTCFullYear());
          if (type === TickMarkType.Month) return MONTH.format(d);
          return DAY.format(d);
        },
      },
      // Let the page scroll vertically on touch screens; horizontal drags pan the chart.
      handleScroll: { vertTouchDrag: false },
    });
    chartRef.current = chart;

    const time = (r: PriceRow) => r.time as UTCTimestamp;
    const priceFormat = { type: 'custom' as const, formatter: (p: number) => formatPrice(p), minMove: 0.01 };
    const line = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, crosshairMarkerRadius: 4, priceFormat });
    const candles = chart.addSeries(CandlestickSeries, { priceLineVisible: false, visible: false, priceFormat });
    const sma50 = chart.addSeries(LineSeries, {
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      priceFormat,
    });
    const sma200 = chart.addSeries(LineSeries, {
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      priceFormat,
    });
    const volume = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: 'custom', formatter: (v: number) => formatCompact(v), minMove: 1 },
        priceLineVisible: false,
        lastValueVisible: false,
      },
      1,
    );

    line.setData(rows.filter((r) => r.close !== null).map((r) => ({ time: time(r), value: r.close as number })));
    candles.setData(
      rows
        .filter((r) => r.open !== null && r.high !== null && r.low !== null && r.close !== null)
        .map((r) => ({ time: time(r), open: r.open!, high: r.high!, low: r.low!, close: r.close! })),
    );
    sma50.setData(rows.filter((r) => r.sma50 !== null).map((r) => ({ time: time(r), value: r.sma50 as number })));
    sma200.setData(rows.filter((r) => r.sma200 !== null).map((r) => ({ time: time(r), value: r.sma200 as number })));
    volume.setData(rows.filter((r) => r.volume !== null).map((r) => ({ time: time(r), value: r.volume as number })));

    const panes = chart.panes();
    panes[0]?.setStretchFactor(4);
    panes[1]?.setStretchFactor(1);
    chart.timeScale().fitContent();
    seriesRef.current = { line, candles, sma50, sma200, volume };

    const byTime = new Map(rows.map((r) => [r.time, r]));
    const onMove = (param: MouseEventParams) => {
      const row = typeof param.time === 'number' ? byTime.get(param.time) : undefined;
      if (!row || !param.point || param.point.x < 0) {
        setHover(null);
        return;
      }
      setHover({ row, x: param.point.x });
    };
    chart.subscribeCrosshairMove(onMove);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);

    return () => {
      ro.disconnect();
      chart.unsubscribeCrosshairMove(onMove);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setHover(null);
    };
  }, [rows]);

  // Theme colors (resolved from CSS tokens after the theme class changes).
  useEffect(() => {
    const chart = chartRef.current;
    const s = seriesRef.current;
    if (!chart || !s) return;
    const text = resolveColor('var(--chart-axis)');
    const grid = resolveColor('var(--chart-grid)');
    const border = resolveColor('var(--border)');
    const main = resolveColor(style.color);
    const up = resolveColor('var(--up)');
    const down = resolveColor('var(--down)');
    chart.applyOptions({
      layout: { textColor: text, panes: { separatorColor: border, separatorHoverColor: border } },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border },
      crosshair: {
        vertLine: { color: withAlpha(text, 0.5), labelBackgroundColor: resolveColor('var(--foreground)') },
        horzLine: { color: withAlpha(text, 0.5), labelBackgroundColor: resolveColor('var(--foreground)') },
      },
    });
    s.line.applyOptions({ color: main, lineStyle: style.dashed ? LineStyle.Dashed : LineStyle.Solid });
    // Hollow up candles and filled down candles, so direction does not rely on color alone.
    s.candles.applyOptions({
      upColor: 'rgba(0, 0, 0, 0)',
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    });
    s.sma50.applyOptions({ color: resolveColor('var(--chart-sma50)') });
    s.sma200.applyOptions({ color: resolveColor('var(--chart-sma200)') });
    s.volume.applyOptions({ color: resolveColor('var(--chart-volume)') });
  }, [isDark, rows, style.color, style.dashed]);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    s.line.applyOptions({ visible: mode === 'line' });
    s.candles.applyOptions({ visible: mode === 'candles' });
  }, [mode, rows]);

  useEffect(() => {
    seriesRef.current?.sma50.applyOptions({ visible: showSma50 });
    seriesRef.current?.sma200.applyOptions({ visible: showSma200 });
  }, [showSma50, showSma200, rows]);

  useEffect(() => {
    chartRef.current?.priceScale('right', 0).applyOptions({
      mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    });
  }, [logScale, rows]);

  useEffect(() => {
    chartRef.current?.applyOptions({ kineticScroll: { mouse: false, touch: !reducedMotion } });
  }, [reducedMotion, rows]);

  const tooltipWidth = 176;
  const left = hover ? (hover.x + 16 + tooltipWidth > width ? Math.max(0, hover.x - 16 - tooltipWidth) : hover.x + 16) : 0;
  const weekly = interval === '1wk';

  return (
    <div className="relative size-full">
      <div ref={containerRef} className="size-full" aria-hidden="true" data-testid="price-chart-canvas" />
      {hover && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-lg border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-md backdrop-blur-sm"
          style={{ left, width: tooltipWidth }}
          aria-hidden="true"
        >
          <p className="mb-1 font-medium">
            {weekly ? 'Week ending ' : ''}
            {formatDate(hover.row.date)}
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
            {mode === 'candles' && (
              <>
                <dt className="text-muted-foreground">Open</dt>
                <dd className="text-right">{formatPrice(hover.row.open)}</dd>
                <dt className="text-muted-foreground">High</dt>
                <dd className="text-right">{formatPrice(hover.row.high)}</dd>
                <dt className="text-muted-foreground">Low</dt>
                <dd className="text-right">{formatPrice(hover.row.low)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Close</dt>
            <dd className="text-right font-medium">{formatPrice(hover.row.close)}</dd>
            {showSma50 && (
              <>
                <dt className="text-muted-foreground">50 day avg</dt>
                <dd className="text-right">{formatPrice(hover.row.sma50)}</dd>
              </>
            )}
            {showSma200 && (
              <>
                <dt className="text-muted-foreground">200 day avg</dt>
                <dd className="text-right">{formatPrice(hover.row.sma200)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{weekly ? 'Week volume' : 'Volume'}</dt>
            <dd className="text-right">{formatCompact(hover.row.volume)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
