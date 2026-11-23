import type { Bar, IntervalKey, RangeKey } from '../core/types';
import { addDays, isoWeekStart } from '../core/dates';

/**
 * Aggregates daily bars into weekly (ISO week, Monday start) or monthly bars.
 * Open = first bar's open, close = last bar's close, high/low = extremes, volume = sum.
 * The aggregated bar is dated on the last trading day it contains.
 */
export function aggregateBars(bars: Bar[], interval: IntervalKey): Bar[] {
  if (interval === 'daily') return bars;
  const groups = new Map<string, Bar[]>();
  for (const b of bars) {
    const key = interval === 'weekly' ? isoWeekStart(b.t) : b.t.slice(0, 7);
    const g = groups.get(key);
    if (g) g.push(b);
    else groups.set(key, [b]);
  }
  const out: Bar[] = [];
  for (const g of groups.values()) {
    const first = g[0];
    const last = g[g.length - 1];
    const vols = g.map((x) => x.v).filter((v): v is number => v != null);
    out.push({
      t: last.t,
      o: first.o,
      h: Math.max(...g.map((x) => x.h)),
      l: Math.min(...g.map((x) => x.l)),
      c: last.c,
      v: vols.length ? vols.reduce((a, b) => a + b, 0) : null,
      adj: last.adj ?? null,
    });
  }
  return out;
}

const RANGE_DAYS: Record<Exclude<RangeKey, 'MAX'>, number> = {
  '1M': 31, '3M': 92, '6M': 183, '1Y': 366, '3Y': 1096, '5Y': 1827,
};

/** Trims bars to a window ending on the LAST bar's date (not today's date), so stale data is never hidden. */
export function sliceRange(bars: Bar[], range: RangeKey): Bar[] {
  if (range === 'MAX' || bars.length === 0) return bars;
  const from = addDays(bars[bars.length - 1].t, -RANGE_DAYS[range]);
  return bars.filter((b) => b.t >= from);
}

/**
 * Rescales OHLC by adjClose/close so historical candles reflect dividends and splits as supplied
 * by the data source. Only valid when every bar has an adjusted close.
 */
export function applyAdjustment(bars: Bar[]): Bar[] {
  return bars.map((b) => {
    if (b.adj == null || b.adj <= 0) return b;
    const k = b.adj / b.c;
    return { ...b, o: b.o * k, h: b.h * k, l: b.l * k, c: b.adj };
  });
}
