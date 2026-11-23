import type { Bar } from '../core/types';
import { fmtPct, fmtPrice } from '../core/format';
import { pctChange } from './returns';

/**
 * Plain-language description of what the loaded price history shows. Purely descriptive:
 * no prediction, no valuation judgement, no causal explanation.
 */
export function describePriceHistory(bars: Bar[], currency: string): string[] {
  if (bars.length < 2) return ['There is not enough price history loaded to describe how this price has moved.'];
  const first = bars[0];
  const last = bars[bars.length - 1];
  const total = pctChange(first.c, last.c);
  let hi = bars[0];
  let lo = bars[0];
  let worstDay: { t: string; pct: number } | null = null;
  let bestDay: { t: string; pct: number } | null = null;
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].c > hi.c) hi = bars[i];
    if (bars[i].c < lo.c) lo = bars[i];
    if (i > 0) {
      const p = pctChange(bars[i - 1].c, bars[i].c);
      if (p == null) continue;
      if (!worstDay || p < worstDay.pct) worstDay = { t: bars[i].t, pct: p };
      if (!bestDay || p > bestDay.pct) bestDay = { t: bars[i].t, pct: p };
    }
  }
  const lines = [
    `Across the loaded history (${first.t} to ${last.t}), the closing price moved from ${fmtPrice(first.c, currency)} to ${fmtPrice(last.c, currency)} (${fmtPct(total)}).`,
    `The highest close was ${fmtPrice(hi.c, currency)} on ${hi.t} and the lowest was ${fmtPrice(lo.c, currency)} on ${lo.t}.`,
  ];
  if (worstDay && bestDay) {
    lines.push(`The largest one-day rise was ${fmtPct(bestDay.pct)} (${bestDay.t}) and the largest one-day fall was ${fmtPct(worstDay.pct)} (${worstDay.t}).`);
  }
  lines.push('This describes the past only. It does not predict future prices and says nothing about whether the company is good value.');
  return lines;
}
