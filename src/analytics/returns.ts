import type { Bar } from '../core/types';
import { addDays } from '../core/dates';

export function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / from) * 100;
}

/** Close on the last trading day on or before `date`, or null when there is no such bar. */
export function closeOnOrBefore(bars: Bar[], date: string): number | null {
  let lo = 0;
  let hi = bars.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].t <= date) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans === -1 ? null : bars[ans].c;
}

export const PERIODS = [
  { key: '1M', days: 30 },
  { key: '3M', days: 91 },
  { key: '6M', days: 182 },
  { key: '1Y', days: 365 },
] as const;

/** Return over a calendar window ending at the series' last bar. Null if history is too short. */
export function periodReturn(bars: Bar[], days: number): number | null {
  if (bars.length < 2) return null;
  const last = bars[bars.length - 1];
  const startDate = addDays(last.t, -days);
  if (bars[0].t > startDate) return null; // not enough history; never extrapolate
  const start = closeOnOrBefore(bars, startDate);
  return start == null ? null : pctChange(start, last.c);
}

/** Annualised volatility (%) from the last `window` daily log returns. Null with too little data. */
export function annualisedVolatility(bars: Bar[], window = 20): number | null {
  if (bars.length < window + 1) return null;
  const slice = bars.slice(-(window + 1));
  const rets: number[] = [];
  for (let i = 1; i < slice.length; i++) rets.push(Math.log(slice[i].c / slice[i - 1].c));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export function maxDrawdown(bars: Bar[]): number | null {
  if (bars.length < 2) return null;
  let peak = bars[0].c;
  let worst = 0;
  for (const b of bars) {
    if (b.c > peak) peak = b.c;
    worst = Math.min(worst, (b.c - peak) / peak);
  }
  return worst * 100;
}
