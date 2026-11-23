import type { Bar, PriceSeries, Security } from '../core/types';
import { addDays, parseISODate, toISODate } from '../core/dates';
import type { Fundamentals, StatementPeriod } from '../core/fundamentals';
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

/**
 * Fictional statements for the fictional demo companies, so the ratio, health, valuation and
 * scanner pages can be explored. Deterministic, invented, and labelled as synthetic everywhere
 * they are stored. DEMO6 is treated as a financial institution and DEMO7 is deliberately weak.
 */
const DEMO_FIN: Record<string, { shares: number; rev: number; growth: number; margin: number; debt: number; equityRatio: number; payout: number; financial?: boolean; weak?: boolean }> = {
  DEMO1: { shares: 900e6, rev: 4200e6, growth: 0.07, margin: 0.14, debt: 0.5e9, equityRatio: 0.55, payout: 0.4 },
  DEMO2: { shares: 1200e6, rev: 2600e6, growth: 0.03, margin: 0.09, debt: 0.9e9, equityRatio: 0.45, payout: 0.55 },
  DEMO3: { shares: 2000e6, rev: 3100e6, growth: -0.02, margin: 0.03, debt: 1.8e9, equityRatio: 0.3, payout: 0.3 },
  DEMO4: { shares: 3500e6, rev: 1500e6, growth: 0.15, margin: 0.11, debt: 0.4e9, equityRatio: 0.6, payout: 0.1 },
  DEMO5: { shares: 400e6, rev: 3800e6, growth: 0.05, margin: 0.17, debt: 0.2e9, equityRatio: 0.7, payout: 0.6 },
  DEMO6: { shares: 1600e6, rev: 2900e6, growth: 0.06, margin: 0.28, debt: 0, equityRatio: 0.09, payout: 0.5, financial: true },
  DEMO7: { shares: 1800e6, rev: 2400e6, growth: -0.08, margin: -0.02, debt: 2.2e9, equityRatio: 0.25, payout: 0, weak: true },
  DEMO8: { shares: 5000e6, rev: 900e6, growth: 0.12, margin: 0.06, debt: 0.5e9, equityRatio: 0.5, payout: 0.2 },
};

export function generateDemoFundamentals(now: Date = new Date()): Fundamentals[] {
  const year = now.getUTCFullYear();
  const out: Fundamentals[] = [];
  for (const [code, d] of Object.entries(DEMO_FIN)) {
    const rand = mulberry32(code.charCodeAt(code.length - 1) * 977);
    const periods: StatementPeriod[] = [];
    for (let i = 0; i < 4; i++) {
      const y = year - 4 + i; // last four completed calendar years
      const rev = d.rev * Math.pow(1 + d.growth, i - 3) * (1 + 0.02 * (rand() - 0.5));
      const m = d.margin + 0.01 * (rand() - 0.5);
      const ni = rev * m;
      const opInc = d.financial ? ni * 1.3 : ni * 1.35 + (d.debt > 0 ? d.debt * 0.04 : 0);
      const assets = d.financial ? rev * 12 : rev * 0.9;
      const equity = assets * d.equityRatio;
      const debt = d.debt * (1 + 0.03 * (i - 3));
      const ocf = d.financial ? ni * 1.1 : ni + rev * 0.04;
      const r = (n: number) => Math.round(n);
      periods.push({
        periodEnd: `${y}-12-31`, kind: 'annual',
        revenue: r(rev), costOfRevenue: d.financial ? undefined : r(rev * 0.62), operatingIncome: r(opInc), interestExpense: debt > 0 ? r(debt * 0.04) : undefined,
        netIncome: r(ni), eps: Math.round((ni / d.shares) * 10000) / 10000,
        dividendsPerShare: d.payout > 0 && ni > 0 ? Math.round(((ni * d.payout) / d.shares) * 10000) / 10000 : 0,
        totalAssets: r(assets), totalLiabilities: r(assets - equity), equity: r(equity),
        currentAssets: d.financial ? undefined : r(rev * 0.3), currentLiabilities: d.financial ? undefined : r(rev * (d.weak ? 0.36 : 0.2)), inventory: d.financial ? undefined : r(rev * 0.05),
        totalDebt: d.financial ? undefined : r(debt), cash: r(rev * 0.06), operatingCashFlow: r(ocf), capex: d.financial ? undefined : r(rev * 0.035),
      });
    }
    out.push({
      securityId: `XKLS:${code}`, currency: 'MYR', sharesOutstanding: d.shares, isFinancial: !!d.financial, periods,
      source: 'Synthetic demo statements (FICTIONAL, not real financials)', loadedAt: now.toISOString(),
      notes: ['Invented for the fictional demo companies so the analysis pages can be explored.'],
    });
  }
  return out;
}
