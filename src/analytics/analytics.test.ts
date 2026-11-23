import type { Bar, PriceSeries, Security } from '../core/types';
import { annualisedVolatility, closeOnOrBefore, maxDrawdown, pctChange, periodReturn } from './returns';
import { buildMarketView, relativePerformance } from './market';
import { squarify } from './treemap';
import { buildMarketSummary } from './summary';
import { getMarketStatus } from '../core/marketStatus';
import { MARKETS } from '../core/markets';
import { fmtPct, fmtPrice } from '../core/format';

const bar = (t: string, c: number, v: number | null = 1000): Bar => ({ t, o: c, h: c, l: c, c, v });
const series = (id: string, bars: Bar[]): PriceSeries => ({
  securityId: id, bars, adjustedAvailable: false,
  quality: { source: 't', lastUpdated: null, observationDate: bars.at(-1)?.t ?? null, currency: 'MYR', reportingPeriod: null, frequency: 'daily', status: 'historical', notes: [] },
});
const sec = (code: string, extra: Partial<Security> = {}): Security => ({
  id: `XKLS:${code}`, market: 'XKLS', code, name: code, kind: 'equity', currency: 'MYR', origin: 'import', ...extra,
});

describe('returns', () => {
  it('computes percentage change and rejects division by zero', () => {
    expect(pctChange(100, 110)).toBeCloseTo(10);
    expect(pctChange(0, 5)).toBeNull();
  });
  it('finds the close on or before a date', () => {
    const bars = [bar('2025-01-02', 1), bar('2025-01-06', 2)];
    expect(closeOnOrBefore(bars, '2025-01-04')).toBe(1);
    expect(closeOnOrBefore(bars, '2025-01-01')).toBeNull();
  });
  it('returns null instead of extrapolating when history is too short', () => {
    const bars = [bar('2025-11-01', 1), bar('2025-11-20', 1.1)];
    expect(periodReturn(bars, 365)).toBeNull();
    expect(periodReturn(bars, 10)).toBeCloseTo(10, 5); // window starts Nov 10; last close on/before is Nov 1 (1.0) -> 1.1 = +10%
  });
  it('computes annualised volatility from log returns', () => {
    const flat = Array.from({ length: 30 }, (_, i) => bar(`2025-01-${String(i + 1).padStart(2, '0')}`, 10));
    expect(annualisedVolatility(flat, 20)).toBeCloseTo(0, 8);
    expect(annualisedVolatility(flat.slice(0, 5), 20)).toBeNull();
  });
  it('computes max drawdown', () => {
    expect(maxDrawdown([bar('2025-01-01', 10), bar('2025-01-02', 12), bar('2025-01-03', 6), bar('2025-01-04', 9)])).toBeCloseTo(-50);
  });
});

describe('buildMarketView', () => {
  const securities = [sec('A'), sec('B'), sec('C'), sec('IDX', { kind: 'index', benchmark: true })];
  const seriesById = {
    'XKLS:A': series('XKLS:A', [bar('2025-11-20', 10), bar('2025-11-21', 11)]),
    'XKLS:B': series('XKLS:B', [bar('2025-11-20', 10), bar('2025-11-21', 9)]),
    'XKLS:C': series('XKLS:C', [bar('2025-11-18', 5), bar('2025-11-19', 6)]), // stale vs 21st
    'XKLS:IDX': series('XKLS:IDX', [bar('2025-11-20', 1500, null), bar('2025-11-21', 1515, null)]),
  };
  const view = buildMarketView(securities, seriesById, 'XKLS');

  it('uses the latest date as reference and excludes stale rows from comparisons', () => {
    expect(view.referenceDate).toBe('2025-11-21');
    expect(view.rows.map((r) => r.security.code).sort()).toEqual(['A', 'B']);
    expect(view.staleRows.map((r) => r.security.code)).toEqual(['C']);
  });
  it('counts breadth only on comparable rows', () => {
    expect(view.breadth).toEqual({ advancing: 1, declining: 1, unchanged: 0, total: 2 });
  });
  it('finds the benchmark index', () => {
    expect(view.benchmark?.changePct).toBeCloseTo(1, 5);
  });
  it('builds data-supported, non-causal summary sentences', () => {
    const text = buildMarketSummary(view).map((i) => i.text).join(' ');
    expect(text).toMatch(/2 loaded securities/);
    expect(text).not.toMatch(/because|due to|caused/i);
  });
  it('returns empty views safely', () => {
    const empty = buildMarketView([], {}, 'XKLS');
    expect(empty.rows).toEqual([]);
    expect(empty.referenceDate).toBeNull();
    expect(buildMarketSummary(empty)).toEqual([]);
  });
  it('relative performance is null without enough history', () => {
    const rel = relativePerformance(view.rows, seriesById['XKLS:IDX']);
    expect(rel[0].returns['1Y'].relative).toBeNull();
  });
});

describe('squarify', () => {
  it('fills the box exactly with areas proportional to values', () => {
    const rects = squarify([{ item: 'a', value: 6 }, { item: 'b', value: 3 }, { item: 'c', value: 1 }], 100, 50);
    const area = rects.reduce((s, r) => s + r.w * r.h, 0);
    expect(area).toBeCloseTo(5000, 4);
    const a = rects.find((r) => r.item === 'a')!;
    expect(a.w * a.h).toBeCloseTo(3000, 4);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(100 + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(50 + 1e-9);
    }
  });
  it('ignores non-positive values and empty input', () => {
    expect(squarify([], 10, 10)).toEqual([]);
    expect(squarify([{ item: 'x', value: 0 }], 10, 10)).toEqual([]);
  });
});

describe('getMarketStatus (Bursa)', () => {
  const m = MARKETS.XKLS;
  it('is open mid-morning on a weekday (KL time)', () => {
    expect(getMarketStatus(m, new Date('2025-11-21T03:00:00Z')).state).toBe('open'); // 11:00 MYT Fri
  });
  it('is on break at 13:30 MYT', () => {
    expect(getMarketStatus(m, new Date('2025-11-21T05:30:00Z')).state).toBe('break');
  });
  it('is closed after 17:00 and on weekends', () => {
    expect(getMarketStatus(m, new Date('2025-11-21T10:00:00Z')).state).toBe('closed');
    expect(getMarketStatus(m, new Date('2025-11-22T03:00:00Z')).state).toBe('weekend');
  });
  it('always carries the holiday caveat', () => {
    expect(getMarketStatus(m, new Date('2025-11-21T03:00:00Z')).holidayCaveat).toBe(true);
  });
});

describe('format', () => {
  it('formats MYR prices and percentages', () => {
    expect(fmtPrice(2.5)).toBe('RM 2.50');
    expect(fmtPrice(2.505)).toBe('RM 2.505');
    expect(fmtPct(1.234)).toBe('+1.23%');
    expect(fmtPct(null)).toBe('–');
  });
});
