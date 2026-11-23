import { freeCashFlowOf, periodsOf, type Fundamentals } from '../core/fundamentals';
import type { Bar } from '../core/types';
import { annualisedVolatility, maxDrawdown } from './returns';
import { epsOf } from './ratios';

export interface PriceRisk {
  vol20: number | null;
  vol60: number | null;
  maxDrawdown: number | null;
  /** Historical 1-day 95% value-at-risk as a positive % loss, or null with < 100 daily returns. */
  var95: number | null;
  downsideDeviation: number | null;
  beta: number | null;
  betaObservations: number;
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

function dailyReturns(bars: Bar[]): { t: string; r: number }[] {
  const out: { t: string; r: number }[] = [];
  for (let i = 1; i < bars.length; i++) if (bars[i - 1].c > 0) out.push({ t: bars[i].t, r: bars[i].c / bars[i - 1].c - 1 });
  return out;
}

/** Beta from daily returns on dates present in both series (needs ≥ 60 overlapping returns). */
export function betaVs(bars: Bar[], bench: Bar[]): { beta: number | null; n: number } {
  const b = new Map(dailyReturns(bench).map((x) => [x.t, x.r]));
  const xs: number[] = [];
  const ys: number[] = [];
  for (const x of dailyReturns(bars)) if (b.has(x.t)) { xs.push(b.get(x.t) as number); ys.push(x.r); }
  if (xs.length < 60) return { beta: null, n: xs.length };
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  let varX = 0;
  for (let i = 0; i < xs.length; i++) { cov += (xs[i] - mx) * (ys[i] - my); varX += (xs[i] - mx) ** 2; }
  return { beta: varX > 0 ? cov / varX : null, n: xs.length };
}

export function priceRisk(bars: Bar[], bench?: Bar[] | null): PriceRisk {
  const rets = dailyReturns(bars).map((x) => x.r);
  let var95: number | null = null;
  if (rets.length >= 100) {
    const s = [...rets].sort((a, b) => a - b);
    var95 = -s[Math.floor(0.05 * s.length)] * 100;
  }
  const downs = rets.filter((r) => r < 0);
  const downsideDeviation = rets.length >= 30 ? Math.sqrt(downs.reduce((a, r) => a + r * r, 0) / rets.length) * Math.sqrt(252) * 100 : null;
  const bt = bench ? betaVs(bars, bench) : { beta: null, n: 0 };
  return { vol20: annualisedVolatility(bars, 20), vol60: annualisedVolatility(bars, 60), maxDrawdown: maxDrawdown(bars), var95, downsideDeviation, beta: bt.beta, betaObservations: bt.n };
}

// ---------- Fundamental stability ----------

export interface Stability { label: string; value: string; note: string }

export function stabilityMetrics(f: Fundamentals): Stability[] {
  const a = periodsOf(f, 'annual');
  const out: Stability[] = [];
  const cv = (xs: number[]) => { const m = mean(xs); return m === 0 ? null : Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) / Math.abs(m); };
  const ni = a.map((p) => p.netIncome).filter((x): x is number => x != null);
  const fcf = a.map((p) => freeCashFlowOf(p)).filter((x): x is number => x != null);
  out.push(ni.length >= 3 ? { label: 'Earnings stability', value: `${Math.round((cv(ni) ?? 0) * 100)}% variation`, note: `Standard deviation of annual net income as a share of its average, over ${ni.length} years. Lower is steadier.` } : { label: 'Earnings stability', value: 'Unavailable', note: 'Needs at least three annual periods.' });
  out.push(fcf.length >= 3 ? { label: 'Cash flow stability', value: `${Math.round((cv(fcf) ?? 0) * 100)}% variation`, note: `Same measure for free cash flow over ${fcf.length} years.` } : { label: 'Cash flow stability', value: 'Unavailable', note: 'Needs at least three annual periods with free cash flow.' });
  const last = a[a.length - 1];
  if (last && last.dividendsPerShare != null) {
    const e = epsOf(last, f.sharesOutstanding);
    out.push({ label: 'Dividend sustainability', value: e != null && e > 0 ? `${((last.dividendsPerShare / e) * 100).toFixed(0)}% of earnings paid out` : 'Dividend exceeds or earnings not positive', note: 'Above 100% means the dividend was paid from more than that year\'s earnings.' });
    const fc = freeCashFlowOf(last);
    if (fc != null && f.sharesOutstanding) out.push({ label: 'Dividend covered by free cash flow', value: fc >= last.dividendsPerShare * f.sharesOutstanding ? 'Yes' : 'No', note: 'Compares total dividends with free cash flow for the latest annual period.' });
  }
  if (!f.isFinancial && last?.totalDebt != null && last.equity != null && last.equity > 0) out.push({ label: 'Financial leverage', value: `${(last.totalDebt / last.equity).toFixed(2)}x debt-to-equity`, note: 'Total debt ÷ shareholders\' equity.' });
  if (!f.isFinancial && last?.currentAssets != null && last.currentLiabilities) out.push({ label: 'Liquidity', value: `${(last.currentAssets / last.currentLiabilities).toFixed(2)}x current ratio`, note: 'Current assets ÷ current liabilities.' });
  return out;
}

// ---------- Hypothetical scenarios (not forecasts) ----------

export interface ScenarioInput {
  revenueShockPct: number;
  /** Share of the cost base that does not fall when revenue falls (0-100). */
  fixedCostSharePct: number;
  marginShockPp: number;
  /** Interest-rate rise in percentage points. */
  rateShockPp: number;
  /** Share of total debt whose rate floats (0-100). */
  floatingDebtSharePct: number;
  taxRatePct: number;
}

export interface ScenarioResult {
  baseNetIncome: number;
  shockedNetIncome: number;
  netIncomeChangePct: number | null;
  baseEps: number | null;
  shockedEps: number | null;
  impliedPe: number | null;
  steps: string[];
}

/**
 * Hypothetical earnings sensitivity. Transparent arithmetic on the latest annual figures with the
 * assumptions you set. It answers "what if", it does not predict anything.
 */
export function earningsScenario(f: Fundamentals, price: number | null, s: ScenarioInput): ScenarioResult | { error: string } {
  const a = periodsOf(f, 'annual');
  const p = a[a.length - 1];
  if (!p || p.revenue == null || p.operatingIncome == null || p.netIncome == null) return { error: 'Needs revenue, operating income and net income for the latest annual period.' };
  const tax = s.taxRatePct / 100;
  const costs = p.revenue - p.operatingIncome;
  const fixed = costs * (s.fixedCostSharePct / 100);
  const variable = costs - fixed;
  const newRevenue = p.revenue * (1 + s.revenueShockPct / 100);
  const newVariable = variable * (newRevenue / p.revenue);
  let newOp = newRevenue - fixed - newVariable + newRevenue * (s.marginShockPp / 100);
  const steps = [
    `Revenue ${p.revenue.toLocaleString()} → ${Math.round(newRevenue).toLocaleString()} (${s.revenueShockPct >= 0 ? '+' : ''}${s.revenueShockPct}%).`,
    `Costs split into fixed ${Math.round(fixed).toLocaleString()} (unchanged) and variable ${Math.round(variable).toLocaleString()} (scales with revenue).`,
    `Operating income ${p.operatingIncome.toLocaleString()} → ${Math.round(newOp).toLocaleString()} after a ${s.marginShockPp} percentage-point margin change.`,
  ];
  let extraInterest = 0;
  if (s.rateShockPp !== 0 && p.totalDebt != null) {
    extraInterest = p.totalDebt * (s.floatingDebtSharePct / 100) * (s.rateShockPp / 100);
    newOp -= extraInterest;
    steps.push(`Rates +${s.rateShockPp}pp on ${s.floatingDebtSharePct}% floating debt adds ${Math.round(extraInterest).toLocaleString()} of interest cost.`);
  }
  // Net income moves by the after-tax change in pre-tax profit.
  const deltaPretax = newOp - p.operatingIncome;
  const shockedNi = p.netIncome + deltaPretax * (1 - tax);
  const shares = f.sharesOutstanding;
  const baseEps = epsOf(p, shares);
  const shockedEps = shares ? shockedNi / shares : null;
  steps.push(`Net income changes by the after-tax change in operating profit (${s.taxRatePct}% tax): ${p.netIncome.toLocaleString()} → ${Math.round(shockedNi).toLocaleString()}.`);
  return {
    baseNetIncome: p.netIncome, shockedNetIncome: shockedNi,
    netIncomeChangePct: p.netIncome !== 0 ? ((shockedNi - p.netIncome) / Math.abs(p.netIncome)) * 100 : null,
    baseEps, shockedEps,
    impliedPe: price != null && shockedEps != null && shockedEps > 0 ? price / shockedEps : null,
    steps,
  };
}

export function priceShock(value: number, shockPct: number): { newValue: number; change: number } {
  const newValue = value * (1 + shockPct / 100);
  return { newValue, change: newValue - value };
}
