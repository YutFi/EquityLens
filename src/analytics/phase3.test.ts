import type { Bar, PriceSeries, Security } from '../core/types';
import type { Fundamentals, StatementPeriod } from '../core/fundamentals';
import { addDays } from '../core/dates';
import { bollinger, ema, macd, rsi, sma, snapshot, supportResistance } from './indicators';
import { cagr, computeRatios, ratioValue } from './ratios';
import { assessHealth, classify, scale } from './health';
import { dcf, gordon, justifiedPb, median, runValuation } from './valuation';
import { backtestMethod, forecastAt, MIN_HISTORY_BARS, runForecast } from './forecast';
import { betaVs, earningsScenario, priceRisk, priceShock } from './risk';
import { computeMetrics } from './metrics';
import { scoreOpportunity } from './opportunities';
import { summarise, validateTxn, type Portfolio } from './portfolio';
import { evaluateAlerts } from './alerts';
import { summariseSectors } from './sectors';
import { parseFundamentalsCsv } from '../data/fundamentalsCsv';
import { generateDemoFundamentals } from '../data/demoData';
import { buildEodhdSeries, fetchEodhdHistory, parseEodhd } from '../data/providers/eodhd';

const mkBars = (closes: number[], start = '2024-01-01'): Bar[] => {
  const out: Bar[] = [];
  let d = start;
  for (const c of closes) {
    out.push({ t: d, o: c, h: c * 1.01, l: c * 0.99, c, v: 1000 });
    d = addDays(d, 1);
  }
  return out;
};
const walk = (n: number, drift = 0.0005, seed = 7): number[] => {
  let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 - 0.5; };
  const out: number[] = []; let p = 10;
  for (let i = 0; i < n; i++) { p *= Math.exp(drift + rnd() * 0.02); out.push(p); }
  return out;
};
const series = (id: string, bars: Bar[]): PriceSeries => ({
  securityId: id, bars, adjustedAvailable: false,
  quality: { source: 't', lastUpdated: null, observationDate: bars.at(-1)?.t ?? null, currency: 'MYR', reportingPeriod: null, frequency: 'daily', status: 'historical', notes: [] },
});
const sec = (code: string, extra: Partial<Security> = {}): Security => ({ id: `XKLS:${code}`, market: 'XKLS', code, name: code, kind: 'equity', currency: 'MYR', origin: 'import', ...extra });

const period = (year: number, p: Partial<StatementPeriod> = {}): StatementPeriod => ({ periodEnd: `${year}-12-31`, kind: 'annual', ...p });
const fund = (periods: StatementPeriod[], extra: Partial<Fundamentals> = {}): Fundamentals => ({
  securityId: 'XKLS:T', currency: 'MYR', sharesOutstanding: 1000, isFinancial: false, periods, source: 'entered by you', loadedAt: '2025-01-01T00:00:00Z', notes: [], ...extra,
});
const fullYear = (y: number, k = 1): StatementPeriod => period(y, {
  revenue: 1000 * k, costOfRevenue: 600 * k, operatingIncome: 200 * k, netIncome: 150 * k, eps: 0.15 * k, dividendsPerShare: 0.05,
  totalAssets: 2000, currentAssets: 800, inventory: 200, totalLiabilities: 900, currentLiabilities: 400, totalDebt: 300, equity: 1100, cash: 150,
  operatingCashFlow: 220 * k, capex: 80, interestExpense: 20,
});

describe('indicators', () => {
  it('SMA matches a hand calculation and is null until the window fills', () => {
    const r = sma([1, 2, 3, 4, 5], 3);
    expect(r.slice(0, 2)).toEqual([null, null]);
    expect(r[2]).toBeCloseTo(2); expect(r[4]).toBeCloseTo(4);
  });
  it('EMA of a constant series is that constant', () => {
    expect(ema(Array(30).fill(5), 10).at(-1)).toBeCloseTo(5);
  });
  it('RSI is 100 for a strictly rising series and 0 for a strictly falling one', () => {
    expect(rsi(Array.from({ length: 40 }, (_, i) => 10 + i)).at(-1)).toBeCloseTo(100);
    expect(rsi(Array.from({ length: 40 }, (_, i) => 100 - i)).at(-1)).toBeCloseTo(0);
  });
  it('RSI stays within 0-100 and is null with too little data', () => {
    expect(rsi([1, 2, 3])).toEqual([null, null, null]);
    for (const v of rsi(walk(120)).filter((x): x is number => x != null)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
  });
  it('Bollinger bands collapse to the mean on a flat series', () => {
    const b = bollinger(Array(30).fill(10));
    expect(b.upper.at(-1)).toBeCloseTo(10); expect(b.lower.at(-1)).toBeCloseTo(10);
  });
  it('MACD histogram equals macd minus signal', () => {
    const m = macd(walk(120)); const i = 100;
    expect(m.hist[i]).toBeCloseTo((m.macd[i] as number) - (m.signal[i] as number));
  });
  it('snapshot handles short histories without throwing', () => {
    expect(() => snapshot(mkBars([1, 2, 3]))).not.toThrow();
  });
  it('finds a support level near a repeated swing low', () => {
    const closes = [...Array(60)].map((_, i) => 10 + 2 * Math.abs(Math.sin(i / 4.5)));
    const lv = supportResistance(mkBars(closes));
    expect(lv.supports.length + lv.resistances.length).toBeGreaterThan(0);
  });
});

describe('ratios', () => {
  const f = fund([fullYear(2023, 0.9), fullYear(2024)]);
  const r = computeRatios({ fundamentals: f, price: 3 });
  it('computes P/E from price and EPS', () => { expect(ratioValue(r, 'pe')).toBeCloseTo(3 / 0.15); });
  it('computes market-cap based P/B (1000 shares at 3 = 3000 over 1100 equity)', () => { expect(ratioValue(r, 'pb')).toBeCloseTo(3000 / 1100); });
  it('computes margins and ROE in percent', () => {
    expect(ratioValue(r, 'netMargin')).toBeCloseTo(15);
    expect(ratioValue(r, 'grossMargin')).toBeCloseTo(40);
    expect(ratioValue(r, 'roe')).toBeCloseTo((150 / 1100) * 100);
  });
  it('computes current ratio and growth', () => {
    expect(ratioValue(r, 'current')).toBeCloseTo(2);
    expect(ratioValue(r, 'revenueGrowth')).toBeCloseTo((1000 / 900 - 1) * 100);
  });
  it('returns null with an explanation for P/E when earnings are negative', () => {
    const neg = computeRatios({ fundamentals: fund([period(2024, { eps: -0.2, netIncome: -200, equity: 500 })]), price: 2 });
    const pe = neg.find((x) => x.key === 'pe');
    expect(pe?.value).toBeNull(); expect(pe?.note).toMatch(/negative|loss/i);
  });
  it('returns null instead of dividing by zero or guessing', () => {
    const none = computeRatios({ fundamentals: fund([period(2024, { revenue: 0 })]), price: null });
    expect(none.every((x) => x.value === null || Number.isFinite(x.value))).toBe(true);
    expect(ratioValue(none, 'pe')).toBeNull();
  });
  it('skips industrial leverage and liquidity ratios for financial institutions', () => {
    const bank = computeRatios({ fundamentals: fund([fullYear(2024)], { isFinancial: true }), price: 3 });
    expect(ratioValue(bank, 'debtEquity')).toBeNull(); expect(ratioValue(bank, 'current')).toBeNull();
  });
  it('CAGR needs two positive endpoints', () => {
    expect(cagr([100, 121])).toBeCloseTo(21);
    expect(cagr([100])).toBeNull();
    expect(cagr([-5, 10])).toBeNull();
  });
});

describe('health score', () => {
  it('scale is linear, clamped and direction-aware', () => {
    expect(scale(5, 0, 10)).toBe(50); expect(scale(-3, 0, 10)).toBe(0); expect(scale(99, 0, 10)).toBe(100);
    expect(scale(2, 10, 0)).toBeCloseTo(80);
  });
  it('classifies at the documented thresholds', () => {
    expect(classify(80)).toBe('Excellent'); expect(classify(65)).toBe('Strong'); expect(classify(50)).toBe('Moderate'); expect(classify(35)).toBe('Weak'); expect(classify(34.9)).toBe('High risk');
  });
  it('reports insufficient data instead of scoring an empty company', () => {
    const h = assessHealth(fund([]));
    expect(h.score).toBeNull(); expect(h.classification).toBe('Insufficient data');
  });
  it('scores a healthy company and re-normalises over available components', () => {
    const h = assessHealth(fund([fullYear(2023, 0.9), fullYear(2024)]), 3);
    expect(h.score).not.toBeNull(); expect(h.coverage).toBeGreaterThan(50);
    expect(h.score as number).toBeGreaterThanOrEqual(0); expect(h.score as number).toBeLessThanOrEqual(100);
  });
  it('does not treat missing components as poor', () => {
    const partial = assessHealth(fund([period(2023, { revenue: 900, netIncome: 130, equity: 1000, operatingCashFlow: 200, capex: 50 }), period(2024, { revenue: 1000, netIncome: 150, equity: 1100, operatingCashFlow: 220, capex: 60 })]));
    expect(partial.components.some((c) => c.score === null)).toBe(true);
    expect(partial.score).not.toBeNull();
  });
});

describe('valuation', () => {
  it('median handles odd, even and empty input', () => {
    expect(median([3, 1, 2])).toBe(2); expect(median([1, 2, 3, 4])).toBe(2.5); expect(median([])).toBeNull();
  });
  it('Gordon growth: D x (1+g) / (r - g)', () => { expect(gordon(0.1, 3, 8)).toBeCloseTo((0.1 * 1.03) / 0.05); });
  it('refuses discount rate at or below growth', () => {
    expect(gordon(0.1, 8, 8)).toBeNull(); expect(gordon(0.1, 9, 8)).toBeNull();
    expect(justifiedPb(10, 8, 8)).toBeNull();
  });
  it('DCF refuses terminal growth at or above the discount rate', () => {
    const out = dcf({ baseFcf: 100, growthPct: 5, years: 5, discountRatePct: 8, terminalGrowthPct: 8, shares: 100 });
    expect(out.ok).toBe(false);
    expect(dcf({ baseFcf: -5, growthPct: 5, years: 5, discountRatePct: 10, terminalGrowthPct: 3, shares: 100 }).ok).toBe(false);
    const good = dcf({ baseFcf: 100, growthPct: 0, years: 1, discountRatePct: 10, terminalGrowthPct: 0, shares: 10 });
    expect(good.ok && good.equityValue).toBeCloseTo(100 / 1.1 + (100 / 0.1) / 1.1);
  });
  it('runs end to end and reports margin of safety relative to fair value', () => {
    const f = fund([fullYear(2022, 0.8), fullYear(2023, 0.9), fullYear(2024)]);
    const v = runValuation({ fundamentals: f, price: 1, bars: mkBars(walk(300)), peers: { pe: [], pb: [], ps: [] } });
    expect(v.methods.length).toBeGreaterThan(0);
    expect(v.assumptions.some((a) => a.source === 'default assumption')).toBe(true);
    if (v.fairValue != null) expect(v.marginOfSafetyPct).toBeCloseTo(((v.fairValue - 1) / v.fairValue) * 100);
  });
  it('uses relative valuation only with at least three peers', () => {
    const f = fund([fullYear(2023, 0.9), fullYear(2024)]);
    const few = runValuation({ fundamentals: f, price: 2, bars: [], peers: { pe: [10, 12], pb: [], ps: [] } });
    expect(few.methods.find((m) => /peer|relative/i.test(m.name))?.applicable ?? false).toBe(false);
  });
  it('produces no fair value from empty statements', () => {
    const v = runValuation({ fundamentals: fund([]), price: 2, bars: [], peers: { pe: [], pb: [], ps: [] } });
    expect(v.fairValue).toBeNull();
  });
});

describe('forecasting', () => {
  it('refuses to forecast with too little history', () => {
    const out = runForecast(mkBars(walk(MIN_HISTORY_BARS - 1)), '30D');
    expect(out.ok).toBe(false);
  });
  it('forecasts with intervals that contain the point and widen with horizon', () => {
    const logs = walk(300).map(Math.log);
    const a = forecastAt(logs, 5, 'drift'); const b = forecastAt(logs, 60, 'drift');
    expect(a.lower).toBeLessThan(a.point); expect(a.upper).toBeGreaterThan(a.point);
    expect(b.upper - b.lower).toBeGreaterThan(a.upper - a.lower);
  });
  it('backtest uses only data before each origin (no lookahead): shifting future prices does not change earlier forecasts', () => {
    const closes = walk(320); const bars = mkBars(closes);
    const altered = mkBars(closes.map((c, i) => (i >= 300 ? c * 3 : c)));
    const ra = backtestMethod(bars, 5, 'regression'); const rb = backtestMethod(altered, 5, 'regression');
    const a = [...ra.selection, ...ra.holdout]; const b = [...rb.selection, ...rb.holdout];
    const early = a.filter((p) => p.originDate < bars[290].t);
    expect(early.length).toBeGreaterThan(0);
    for (const p of early) {
      const q = b.find((x) => x.originDate === p.originDate);
      expect(q?.forecast).toBeCloseTo(p.forecast, 10);
    }
  });
  it('full run returns held-out metrics, a naive baseline and never claims "reliable"', () => {
    const out = runForecast(mkBars(walk(500)), '30D');
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.table[0].method).toBe('naive');
    expect(out.bearish).toBeLessThan(out.base); expect(out.bullish).toBeGreaterThan(out.base);
    expect(['insufficient', 'no-skill', 'limited']).toContain(out.reliability);
    expect(out.path.length).toBe(out.horizonBars);
    expect(out.reliabilityText.toLowerCase()).not.toMatch(/\breliable\b(?! enough)/);
  });
  it('forecast dates skip weekends', () => {
    const out = runForecast(mkBars(walk(400)), '7D');
    if (!out.ok) throw new Error(out.reason);
    for (const p of out.path) { const d = new Date(`${p.t}T00:00:00Z`).getUTCDay(); expect(d === 0 || d === 6).toBe(false); }
  });
});

describe('risk', () => {
  it('beta of a series against itself is 1', () => {
    const bars = mkBars(walk(200));
    expect(betaVs(bars, bars).beta).toBeCloseTo(1, 6);
  });
  it('price shock is plain arithmetic', () => {
    const r = priceShock(1000, -20); expect(r.newValue).toBeCloseTo(800); expect(r.change).toBeCloseTo(-200);
  });
  it('price risk metrics are finite and downside is non-positive', () => {
    const r = priceRisk(mkBars(walk(300)));
    expect(r.maxDrawdown).toBeLessThanOrEqual(0);
  });
  it('earnings scenario is labelled what-if and changes with the shock', () => {
    const f = fund([fullYear(2024)]);
    const inp = { revenueShockPct: 0, fixedCostSharePct: 50, marginShockPp: 0, rateShockPp: 0, floatingDebtSharePct: 50, taxRatePct: 24 };
    const base = earningsScenario(f, 3, inp);
    const worse = earningsScenario(f, 3, { ...inp, revenueShockPct: -10, marginShockPp: -2 });
    expect('error' in base).toBe(false); expect('error' in worse).toBe(false);
    if (!('error' in base) && !('error' in worse)) { expect(base.shockedNetIncome).toBeCloseTo(base.baseNetIncome); expect(worse.shockedNetIncome).toBeLessThan(base.shockedNetIncome); }
  });
});

describe('metrics, opportunities, sectors, alerts', () => {
  const mk = (code: string, sector: string, k: number, drift: number) => {
    const s = sec(code, { sector });
    const bars = mkBars(walk(320, drift, code.length * 11));
    return computeMetrics(s, series(s.id, bars), fund([fullYear(2023, 0.9 * k), fullYear(2024, k)], { securityId: s.id }), null) as NonNullable<ReturnType<typeof computeMetrics>>;
  };
  const all = [mk('AAA', 'Tech', 1, 0.001), mk('BBB', 'Tech', 1.1, 0), mk('CCC', 'Tech', 0.9, -0.001), mk('DDD', 'Tech', 1.2, 0.0005)];

  it('computeMetrics returns null for an empty series', () => {
    expect(computeMetrics(sec('X'), series('XKLS:X', []), null, null)).toBeNull();
  });
  it('leaves fundamentals-based metrics null when no statements exist', () => {
    const m = computeMetrics(sec('Y'), series('XKLS:Y', mkBars(walk(100))), null, null);
    expect(m?.pe).toBeNull(); expect(m?.health).toBeNull();
  });
  it('opportunity score is 0-100 with visible weights, or null with low coverage', () => {
    const o = scoreOpportunity(all[0], all);
    expect(o.score).not.toBeNull();
    expect(o.score as number).toBeGreaterThanOrEqual(0); expect(o.score as number).toBeLessThanOrEqual(100);
    expect(o.components.reduce((a, c) => a + c.weight, 0)).toBe(100);
    const bare = computeMetrics(sec('Z'), series('XKLS:Z', mkBars(walk(40))), null, null) as NonNullable<ReturnType<typeof computeMetrics>>;
    expect(scoreOpportunity(bare, [bare]).score).toBeNull();
  });
  it('categories separate "not met" from "no data"', () => {
    const bare = computeMetrics(sec('Z2'), series('XKLS:Z2', mkBars(walk(120))), null, null) as NonNullable<ReturnType<typeof computeMetrics>>;
    const o = scoreOpportunity(bare, [bare]);
    const div = o.categories.find((c) => c.id === 'dividend');
    expect(div?.criteria.every((c) => c.status === 'no-data')).toBe(true);
    expect(div?.flagged).toBe(false);
  });
  it('"undervalued" needs the peer-valuation criterion to be evaluable, not just good health and profits', () => {
    const lonely = all.slice(0, 2); // only two same-sector peers: peer comparison needs three
    const o = scoreOpportunity(lonely[0], lonely);
    const c = o.categories.find((x) => x.id === 'undervalued')!;
    expect(c.criteria[0].status).toBe('no-data');
    expect(c.flagged).toBe(false);
  });
  it('sector summary groups only the loaded companies', () => {
    const s = summariseSectors(all);
    expect(s).toHaveLength(1); expect(s[0].count).toBe(4); expect(s[0].sector).toBe('Tech');
  });
  it('alerts fire only on met conditions and report the data date', () => {
    const m = all[0];
    expect(evaluateAlerts({ priceAbove: m.last + 1 }, m)).toEqual([]);
    const hit = evaluateAlerts({ priceAbove: m.last - 0.01 }, m);
    expect(hit).toHaveLength(1); expect(hit[0]).toContain(m.asOf);
    expect(evaluateAlerts({ priceAbove: 1 }, null)).toEqual([]);
  });
});

describe('simulator (portfolio maths)', () => {
  const txn = (id: string, date: string, type: 'buy' | 'sell' | 'dividend', shares: number, price: number, fees = 0) => ({ id, securityId: 'XKLS:A', date, type, shares, price, fees });
  const p = (txns: Portfolio['txns']): Portfolio => ({ id: 'p', name: 'Sim', currency: 'MYR', createdAt: '2025-01-01', txns });

  it('average cost includes fees on buys', () => {
    const s = summarise(p([txn('1', '2025-01-02', 'buy', 100, 2, 10), txn('2', '2025-02-02', 'buy', 100, 4, 10)]), () => 5);
    const pos = s.positions[0];
    expect(pos.shares).toBe(200); expect(pos.avgCost).toBeCloseTo((200 + 10 + 400 + 10) / 200);
    expect(s.unrealised).toBeCloseTo(1000 - 620);
  });
  it('realises profit on a partial sale at average cost, net of fees', () => {
    const s = summarise(p([txn('1', '2025-01-02', 'buy', 100, 2), txn('2', '2025-02-02', 'sell', 40, 3, 5)]), () => 3);
    expect(s.realised).toBeCloseTo((3 - 2) * 40 - 5);
    expect(s.positions[0].shares).toBe(60);
  });
  it('total return % is measured against everything ever bought, not just what is still held', () => {
    const s = summarise(p([txn('1', '2025-01-02', 'buy', 1000, 10, 10), txn('2', '2025-02-02', 'sell', 400, 11, 10)]), () => 12);
    // value 7200, open cost 6006 -> unrealised 1194; realised (11-10.01)*400-10 = 386; total 1580 over 10010 bought
    expect(s.totalReturn).toBeCloseTo(1580);
    expect(s.totalReturnPct).toBeCloseTo((1580 / 10010) * 100);
  });
  it('adds user-entered dividends and counts them in total return', () => {
    const s = summarise(p([txn('1', '2025-01-02', 'buy', 100, 2), txn('2', '2025-03-01', 'dividend', 100, 0.1)]), () => 2);
    expect(s.dividends).toBeCloseTo(10); expect(s.totalReturn).toBeCloseTo(10);
  });
  it('does not guess a portfolio value when a price is missing', () => {
    const s = summarise(p([txn('1', '2025-01-02', 'buy', 100, 2)]), () => null);
    expect(s.totalValue).toBeNull(); expect(s.unrealised).toBeNull(); expect(s.problems.length).toBeGreaterThan(0);
  });
  it('rejects overselling and bad input', () => {
    const existing = [txn('1', '2025-01-02', 'buy', 10, 2)];
    expect(validateTxn({ securityId: 'XKLS:A', date: '2025-02-01', type: 'sell', shares: 11, price: 2, fees: 0 }, existing)).toMatch(/only held/);
    expect(validateTxn({ securityId: 'XKLS:A', date: '2025-02-01', type: 'buy', shares: 0, price: 2, fees: 0 }, existing)).not.toBeNull();
    expect(validateTxn({ securityId: 'XKLS:A', date: 'bad', type: 'buy', shares: 1, price: 2, fees: 0 }, existing)).not.toBeNull();
    expect(validateTxn({ securityId: 'XKLS:A', date: '2025-02-01', type: 'sell', shares: 10, price: 2, fees: 0 }, existing)).toBeNull();
  });
});

describe('statements CSV import', () => {
  const header = 'period_end,kind,revenue,net_income,eps,dividends_per_share,total_assets';
  it('scales amounts by unit but never per-share fields', () => {
    const r = parseFundamentalsCsv(`${header}\n2024-12-31,annual,500,50,0.25,0.1,2000`, 'millions');
    expect(r.fatal).toBeNull();
    expect(r.periods[0].revenue).toBe(500e6); expect(r.periods[0].eps).toBe(0.25); expect(r.periods[0].dividendsPerShare).toBe(0.1);
  });
  it('rejects bad rows with line numbers and keeps the good ones', () => {
    const r = parseFundamentalsCsv(`${header}\n2024-12-31,annual,500,50,0.25,0.1,2000\nnot-a-date,annual,1,1,1,1,1\n2023-12-31,annual,abc,1,1,1,1\n2022-12-31,yearly,1,1,1,1,1`);
    expect(r.periods).toHaveLength(1); expect(r.errorCount).toBe(3);
    expect(r.errors.some((e) => e.startsWith('Line 3'))).toBe(true);
  });
  it('fails clearly without a date column or recognised fields', () => {
    expect(parseFundamentalsCsv('foo,bar\n1,2').fatal).toMatch(/period/i);
    expect(parseFundamentalsCsv('period_end,foo\n2024-12-31,2').fatal).toMatch(/recogni/i);
  });
  it('accepts header aliases, semicolons, and keeps blank cells blank', () => {
    const r = parseFundamentalsCsv('Date;Sales;Profit After Tax;EPS\n2024-12-31;100;;0.5');
    expect(r.periods[0].revenue).toBe(100); expect(r.periods[0].netIncome).toBeUndefined(); expect(r.periods[0].eps).toBe(0.5);
  });
  it('de-duplicates the same period and sorts oldest first', () => {
    const r = parseFundamentalsCsv('period_end,revenue\n2024-12-31,2\n2023-12-31,1\n2024-12-31,3');
    expect(r.periods.map((p) => p.periodEnd)).toEqual(['2023-12-31', '2024-12-31']); expect(r.periods[1].revenue).toBe(3);
  });
});

describe('EODHD provider (parser and error mapping, no live calls)', () => {
  const sample = [
    { date: '2025-11-03', open: 1.0, high: 1.1, low: 0.9, close: 1.05, adjusted_close: 1.05, volume: 1000 },
    { date: '2025-11-04', open: 1.05, high: 1.2, low: 1.0, close: 1.1, adjusted_close: 1.1, volume: 2000 },
    { date: '2025-11-05', open: 'x', high: 1, low: 1, close: 1 },
    { date: '2025-11-06', open: 1, high: 0.5, low: 2, close: 1 },
  ];
  it('keeps valid bars and rejects malformed or inconsistent ones', () => {
    const r = parseEodhd(sample);
    expect(r.bars).toHaveLength(2); expect(r.rejected).toBe(2);
  });
  it('flags a non-array response', () => { expect(parseEodhd({ error: 'x' }).error).toBeTruthy(); });
  it('maps HTTP statuses and network failure to plain-language outcomes without throwing', async () => {
    const s = { market: 'XKLS' as const, code: '1155' };
    const resp = (status: number, body: unknown = []) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
    expect((await fetchEodhdHistory(s, '')).ok).toBe(false);
    expect(await fetchEodhdHistory({ market: 'XNAS', code: 'X' }, 'k')).toMatchObject({ kind: 'unsupported' });
    expect(await fetchEodhdHistory(s, 'k', { fetchImpl: resp(401) })).toMatchObject({ kind: 'auth' });
    expect(await fetchEodhdHistory(s, 'k', { fetchImpl: resp(429) })).toMatchObject({ kind: 'limit' });
    expect(await fetchEodhdHistory(s, 'k', { fetchImpl: resp(404) })).toMatchObject({ kind: 'not-found' });
    expect(await fetchEodhdHistory(s, 'k', { fetchImpl: (async () => { throw new TypeError('blocked'); }) as unknown as typeof fetch })).toMatchObject({ kind: 'network' });
    expect(await fetchEodhdHistory(s, 'k', { fetchImpl: resp(200, sample) })).toMatchObject({ ok: true });
  });
  it('requests the .KLSE symbol and never puts the key anywhere but the query string', async () => {
    let seen = '';
    await fetchEodhdHistory({ market: 'XKLS', code: '1155' }, 'SECRET', { fetchImpl: (async (u: string) => { seen = u; return new Response('[]', { status: 200 }); }) as unknown as typeof fetch });
    expect(seen).toContain('/api/eod/1155.KLSE'); expect(seen).toContain('api_token=SECRET');
  });
  it('never labels fetched data "verified"', () => {
    const s = sec('1155');
    const out = buildEodhdSeries(s, parseEodhd(sample).bars, 2, new Date('2025-11-06T00:00:00Z'));
    expect(out.quality.status).not.toBe('verified');
    expect(out.quality.source).toMatch(/your key/i);
  });
});

describe('synthetic demo statements', () => {
  const funds = generateDemoFundamentals(new Date('2026-11-23T00:00:00Z'));
  const by = (c: string) => funds.find((f) => f.securityId === `XKLS:${c}`)!;
  it('are labelled fictional and deterministic', () => {
    expect(funds).toHaveLength(8);
    expect(funds.every((f) => /FICTIONAL/.test(f.source))).toBe(true);
    expect(JSON.stringify(generateDemoFundamentals(new Date('2026-11-23T00:00:00Z')))).toBe(JSON.stringify(funds));
  });
  it('balance sheets balance and the weak company scores below the strong one', () => {
    for (const f of funds) for (const p of f.periods) expect((p.totalLiabilities as number) + (p.equity as number)).toBeCloseTo(p.totalAssets as number, -1);
    const strong = assessHealth(by('DEMO5'), 10).score as number;
    const weak = assessHealth(by('DEMO7'), 3).score as number;
    expect(strong).toBeGreaterThan(weak);
  });
  it('the financial demo company skips industrial leverage', () => {
    expect(ratioValue(computeRatios({ fundamentals: by('DEMO6'), price: 6 }), 'debtEquity')).toBeNull();
  });
});
