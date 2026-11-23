import type { Bar, PriceSeries, Security } from '../core/types';
import { addDays, parseISODate, toISODate } from '../core/dates';
import { assessSeries } from './quality';

/**
 * SYNTHETIC DEMO DATA.
 * Deterministic random walks for FICTIONAL companies, generated locally so the interface can be
 * explored without importing a file. These are not real prices, and they deliberately use
 * fictional names and codes so they can never be mistaken for a real security.
 */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Last weekday on or before the date. Public holidays are ignored. */
function lastWeekday(d: string): string {
  let cur = d;
  for (;;) {
    const dow = parseISODate(cur).getUTCDay();
    if (dow !== 0 && dow !== 6) return cur;
    cur = addDays(cur, -1);
  }
}

export function generateBars(seed: number, start: number, drift: number, vol: number, baseVolume: number, endDate: string, years = 3): Bar[] {
  const rand = mulberry32(seed);
  const bars: Bar[] = [];
  let day = addDays(endDate, -Math.round(365 * years));
  let price = start;
  while (day <= endDate) {
    const dow = parseISODate(day).getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const ret = drift + vol * gaussian(rand);
      const open = price * (1 + 0.002 * gaussian(rand));
      const close = Math.max(0.05, price * Math.exp(ret));
      const hi = Math.max(open, close) * (1 + Math.abs(0.004 * gaussian(rand)));
      const lo = Math.min(open, close) * (1 - Math.abs(0.004 * gaussian(rand)));
      const volume = Math.round(baseVolume * (0.6 + 0.8 * rand()) * (1 + 6 * Math.abs(ret)));
      const r2 = (n: number) => Math.round(n * 1000) / 1000;
      bars.push({ t: day, o: r2(open), h: r2(hi), l: r2(lo), c: r2(close), v: volume, adj: null });
      price = close;
    }
    day = addDays(day, 1);
  }
  return bars;
}

const DEMO: { code: string; name: string; sector: string; seed: number; start: number; drift: number; vol: number; volume: number }[] = [
  { code: 'DEMO1', name: 'Demo Alpha Berhad (synthetic)', sector: 'Demo Sector A', seed: 11, start: 8.4, drift: 0.0004, vol: 0.011, volume: 3_200_000 },
  { code: 'DEMO2', name: 'Demo Bravo Holdings (synthetic)', sector: 'Demo Sector A', seed: 22, start: 4.1, drift: 0.0001, vol: 0.014, volume: 5_100_000 },
  { code: 'DEMO3', name: 'Demo Charlie Group (synthetic)', sector: 'Demo Sector B', seed: 33, start: 2.35, drift: -0.0002, vol: 0.019, volume: 9_800_000 },
  { code: 'DEMO4', name: 'Demo Delta Resources (synthetic)', sector: 'Demo Sector B', seed: 44, start: 1.12, drift: 0.0006, vol: 0.024, volume: 14_000_000 },
  { code: 'DEMO5', name: 'Demo Echo Industries (synthetic)', sector: 'Demo Sector C', seed: 55, start: 12.9, drift: 0.0002, vol: 0.009, volume: 1_100_000 },
  { code: 'DEMO6', name: 'Demo Foxtrot Capital (synthetic)', sector: 'Demo Sector C', seed: 66, start: 6.6, drift: 0.0003, vol: 0.012, volume: 2_400_000 },
  { code: 'DEMO7', name: 'Demo Golf Energy (synthetic)', sector: 'Demo Sector D', seed: 77, start: 3.05, drift: -0.0004, vol: 0.021, volume: 6_700_000 },
  { code: 'DEMO8', name: 'Demo Hotel Services (synthetic)', sector: 'Demo Sector D', seed: 88, start: 0.88, drift: 0.0005, vol: 0.028, volume: 21_000_000 },
];

export const DEMO_INDEX_ID = 'XKLS:DEMOIDX';

export function generateDemo(now: Date = new Date()): { securities: Security[]; series: PriceSeries[] } {
  const end = lastWeekday(toISODate(now));
  const source = 'Synthetic demo generator (NOT real market data)';
  const securities: Security[] = [];
  const series: PriceSeries[] = [];

  const idxBars = generateBars(7, 1500, 0.0002, 0.006, 0, end).map((b) => ({ ...b, v: null }));
  securities.push({
    id: DEMO_INDEX_ID, market: 'XKLS', code: 'DEMOIDX', name: 'Demo Index (synthetic)',
    kind: 'index', currency: 'MYR', origin: 'demo', benchmark: true,
  });
  series.push({
    securityId: DEMO_INDEX_ID, bars: idxBars, adjustedAvailable: false,
    quality: assessSeries({ bars: idxBars, source, currency: 'MYR', now, synthetic: true }),
  });

  for (const d of DEMO) {
    const id = `XKLS:${d.code}`;
    const bars = generateBars(d.seed, d.start, d.drift, d.vol, d.volume, end);
    securities.push({
      id, market: 'XKLS', code: d.code, name: d.name, kind: 'equity', sector: d.sector,
      currency: 'MYR', origin: 'demo',
    });
    series.push({
      securityId: id, bars, adjustedAvailable: false,
      quality: assessSeries({ bars, source, currency: 'MYR', now, synthetic: true }),
    });
  }
  return { securities, series };
}
