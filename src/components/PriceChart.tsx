import { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, createChart,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts';
import type { Bar } from '../core/types';
import { fmtCompact } from '../core/format';

interface Props {
  bars: Bar[];
  currency: string;
  showVolume: boolean;
  /** Shown to assistive technology and as the chart's accessible name. */
  label: string;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * TradingView Lightweight Charts candlestick view (Apache-2.0; its attribution logo is left on).
 * Colour is never the only cue: the legend prints OHLC numbers for the hovered bar.
 */
export function PriceChart({ bars, currency, showVolume, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [legend, setLegend] = useState<string>('');
  // Chart colours are read from CSS variables, so rebuild the chart whenever the theme attribute changes.
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick((n) => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!box.current) return;
    const text = cssVar('--text-dim') || '#aab2bd';
    const grid = cssVar('--border') || '#242b34';
    const pos = cssVar('--pos') || '#35c47c';
    const neg = cssVar('--neg') || '#f4605c';
    const chart = createChart(box.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: text, fontFamily: "'Inter Variable', Inter, system-ui, sans-serif", fontSize: 12 },
      grid: { vertLines: { visible: false }, horzLines: { color: grid } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.22 } },
      timeScale: { borderVisible: false, timeVisible: false, rightOffset: 4 },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: text, width: 1, style: 3, labelBackgroundColor: cssVar('--raised') || '#131a2b' }, horzLine: { color: text, width: 1, style: 3, labelBackgroundColor: cssVar('--raised') || '#131a2b' } },
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: pos, downColor: neg, borderUpColor: pos, borderDownColor: neg, wickUpColor: pos, wickDownColor: neg,
    });
    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    chartRef.current = chart;
    candleRef.current = candles;
    volRef.current = vol;

    chart.subscribeCrosshairMove((param) => {
      const d = param.seriesData.get(candles) as { open: number; high: number; low: number; close: number } | undefined;
      if (!d) { setLegend(''); return; }
      const v = param.seriesData.get(vol) as { value: number } | undefined;
      setLegend(`O ${d.open.toFixed(3)}  H ${d.high.toFixed(3)}  L ${d.low.toFixed(3)}  C ${d.close.toFixed(3)}${v ? `  Vol ${fmtCompact(v.value)}` : ''}`);
    });
    return () => {
      chart.remove();
      chartRef.current = null; candleRef.current = null; volRef.current = null;
    };
  }, [themeTick]);

  useEffect(() => {
    const candles = candleRef.current;
    const vol = volRef.current;
    if (!candles || !vol || !chartRef.current) return;
    const pos = cssVar('--pos') || '#35c47c';
    const neg = cssVar('--neg') || '#f4605c';
    candles.setData(bars.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c })));
    vol.setData(
      showVolume
        ? bars.filter((b) => b.v != null).map((b) => ({ time: b.t, value: b.v as number, color: b.c >= b.o ? `${pos}66` : `${neg}66` }))
        : [],
    );
    chartRef.current.timeScale().fitContent();
  }, [bars, showVolume, themeTick]);

  return (
    <div className="chart-box" role="img" aria-label={`${label}. Candlestick chart in ${currency}, ${bars.length} bars.`}>
      <div className="chart-legend" aria-hidden="true">{legend || `${currency} · hover a candle for open, high, low, close`}</div>
      <div ref={box} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}

export type { UTCTimestamp };
