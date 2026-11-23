import { median } from './valuation';
import type { Metrics } from './metrics';

export interface SectorSummary {
  sector: string;
  count: number;
  medianChange: number | null;
  median1M: number | null;
  median3M: number | null;
  median6M: number | null;
  medianPe: number | null;
  medianPb: number | null;
  medianDividendYield: number | null;
  medianVol: number | null;
  /** Combined latest traded value (a liquidity proxy, not market cap). */
  tradedValue: number;
  leaders: Metrics[];
  laggards: Metrics[];
}

const med = (xs: (number | null)[]) => median(xs.filter((x): x is number => x != null));

/**
 * Groups the companies you have loaded by sector. Sector names come from the (unverified) directory
 * or what you imported; companies without one are grouped as "Unclassified". These are summaries of
 * the loaded set, not of the whole market.
 */
export function summariseSectors(rows: Metrics[]): SectorSummary[] {
  const groups = new Map<string, Metrics[]>();
  for (const r of rows) {
    if (r.security.kind !== 'equity') continue;
    const k = r.security.sector ?? 'Unclassified';
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return [...groups.entries()].map(([sector, ms]) => {
    const ranked = [...ms].filter((m) => m.ret3M != null).sort((a, b) => (b.ret3M as number) - (a.ret3M as number));
    return {
      sector, count: ms.length,
      medianChange: med(ms.map((m) => m.changePct)), median1M: med(ms.map((m) => m.ret1M)), median3M: med(ms.map((m) => m.ret3M)), median6M: med(ms.map((m) => m.ret6M)),
      medianPe: med(ms.map((m) => (m.pe != null && m.pe > 0 ? m.pe : null))), medianPb: med(ms.map((m) => (m.pb != null && m.pb > 0 ? m.pb : null))),
      medianDividendYield: med(ms.map((m) => m.dividendYield)), medianVol: med(ms.map((m) => m.vol20)),
      tradedValue: ms.reduce((a, m) => a + (m.tradedValue ?? 0), 0),
      leaders: ranked.slice(0, 3), laggards: ranked.slice(-3).reverse(),
    };
  }).sort((a, b) => (b.median3M ?? -Infinity) - (a.median3M ?? -Infinity));
}
