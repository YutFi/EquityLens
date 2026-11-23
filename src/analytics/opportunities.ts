import { freeCashFlowOf, periodsOf } from '../core/fundamentals';
import { scale } from './health';
import type { Metrics } from './metrics';
import { median } from './valuation';

/**
 * Research-priority scanner. It ranks which companies deserve a closer look using fixed, visible
 * rules. A high score does not predict returns, cheap is not the same as undervalued, and
 * momentum is not the same as quality. Criteria without data are "no data", never "failed".
 */

export type CategoryId = 'undervalued' | 'growth' | 'dividend' | 'momentum' | 'recovery' | 'warning';
export type CriterionStatus = 'met' | 'not-met' | 'no-data';

export interface Criterion { text: string; status: CriterionStatus; evidence: string }
export interface CategoryResult {
  id: CategoryId;
  label: string;
  /** True when the category applies. Warnings apply if ANY warning criterion is met; the rest need every evaluable criterion met. */
  flagged: boolean;
  evaluable: number;
  met: number;
  criteria: Criterion[];
}
export interface Component { key: string; label: string; weight: number; score: number | null; explanation: string }
export interface Opportunity {
  metrics: Metrics;
  components: Component[];
  /** 0-100 research priority, or null when too little data (coverage under 40%). */
  score: number | null;
  coverage: number;
  categories: CategoryResult[];
}

const f1 = (n: number | null | undefined, d = 1) => (n == null ? '–' : n.toFixed(d));
const crit = (text: string, value: number | null, test: (v: number) => boolean, evidence: (v: number) => string): Criterion =>
  value == null ? { text, status: 'no-data', evidence: 'Not enough data' } : { text, status: test(value) ? 'met' : 'not-met', evidence: evidence(value) };
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

export function scoreOpportunity(m: Metrics, all: Metrics[]): Opportunity {
  const f = m.fundamentals;
  const annual = f ? periodsOf(f, 'annual') : [];
  const cur = annual[annual.length - 1];
  const prev = annual.length > 1 ? annual[annual.length - 2] : undefined;
  const sector = m.security.sector;
  const peers = all.filter((x) => x.security.id !== m.security.id && sector && x.security.sector === sector);
  const peerMed = (k: 'pe' | 'pb') => { const v = peers.map((p) => p[k]).filter((x): x is number => x != null && x > 0); return v.length >= 3 ? median(v) : null; };

  // ---- components
  const comps: Component[] = [];
  const add = (key: string, label: string, weight: number, score: number | null, explanation: string) => comps.push({ key, label, weight, score, explanation });

  add('health', 'Financial health', 25, m.health?.score ?? null, m.health?.score != null ? `Health score ${f1(m.health.score, 0)} (${m.health.classification}).` : 'Needs enough annual statements for a health score.');

  const rel: number[] = [];
  const pM = peerMed('pe'); const bM = peerMed('pb');
  if (m.pe != null && pM) rel.push(scale(m.pe / pM, 1.5, 0.6));
  if (m.pb != null && bM) rel.push(scale(m.pb / bM, 1.5, 0.6));
  add('valuation', 'Valuation vs peers', 20, rel.length ? mean(rel) : null,
    rel.length ? `P/E ${f1(m.pe)}x vs sector median ${f1(pM)}x; P/B ${f1(m.pb)}x vs ${f1(bM)}x. Cheaper than peers scores higher, which may reflect lower quality rather than a bargain.` : 'Needs at least 3 loaded peers in the same sector with statements.');

  const g: number[] = [];
  if (m.revenueGrowth != null) g.push(scale(m.revenueGrowth, 0, 15));
  if (m.earningsGrowth != null) g.push(scale(m.earningsGrowth, 0, 20));
  add('growth', 'Growth', 15, g.length ? mean(g) : null, g.length ? `Revenue growth ${f1(m.revenueGrowth)}%, earnings growth ${f1(m.earningsGrowth)}%.` : 'Needs two consecutive annual periods.');

  const d: number[] = [];
  const payout = m.ratios?.find((r) => r.key === 'payout')?.value ?? null;
  if (m.dividendYield != null) d.push(scale(m.dividendYield, 0, 6));
  if (payout != null) d.push(scale(payout, 110, 40));
  add('dividend', 'Dividend quality', 10, d.length ? mean(d) : null, d.length ? `Yield ${f1(m.dividendYield)}%, payout ${f1(payout, 0)}% of earnings.` : 'No dividend data entered.');

  const mo: number[] = [];
  if (m.ret3M != null) mo.push(scale(m.ret3M, -10, 20));
  if (m.sma200 != null) mo.push(m.last > m.sma200 ? 100 : 0);
  if (m.sma50 != null) mo.push(m.last > m.sma50 ? 100 : 0);
  if (m.rel3M != null) mo.push(scale(m.rel3M, -10, 10));
  add('momentum', 'Price momentum', 15, mo.length ? mean(mo) : null, mo.length ? `3-month return ${f1(m.ret3M)}%${m.rel3M != null ? `, ${f1(m.rel3M)} points vs the benchmark` : ''}; ${m.sma200 != null ? (m.last > m.sma200 ? 'above' : 'below') + ' its 200-day average' : '200-day average needs more history'}.` : 'Needs at least about 3 months of prices.');

  const rk: number[] = [];
  if (m.vol20 != null) rk.push(scale(m.vol20, 60, 15));
  if (m.maxDD != null) rk.push(scale(m.maxDD, -60, -10));
  add('risk', 'Price risk (lower is better)', 15, rk.length ? mean(rk) : null, rk.length ? `20-day volatility ${f1(m.vol20)}%, worst fall from a peak ${f1(m.maxDD)}%.` : 'Needs more price history.');

  const total = comps.reduce((a, c) => a + c.weight, 0);
  const used = comps.filter((c) => c.score != null);
  const usedW = used.reduce((a, c) => a + c.weight, 0);
  const coverage = (usedW / total) * 100;
  const score = coverage >= 40 && usedW > 0 ? used.reduce((a, c) => a + (c.score as number) * c.weight, 0) / usedW : null;

  // ---- categories
  const cats: CategoryResult[] = [];
  // `core` is the criterion that defines the category (for example "priced below peers"). If it has no data the
  // category cannot apply: the other criteria alone (profitable, low debt...) are not evidence of that label.
  const addCat = (id: CategoryId, label: string, criteria: Criterion[], anyMode = false, minEvaluable = 2, core: number | null = 0) => {
    const evaluable = criteria.filter((c) => c.status !== 'no-data').length;
    const met = criteria.filter((c) => c.status === 'met').length;
    const coreOk = anyMode || core == null || criteria[core].status !== 'no-data';
    cats.push({ id, label, criteria, evaluable, met, flagged: coreOk && (anyMode ? met > 0 : evaluable >= minEvaluable && met === evaluable) });
  };
  const fcf = cur ? freeCashFlowOf(cur) : null;
  const de = m.ratios?.find((r) => r.key === 'debtEquity')?.value ?? null;
  const cr = m.ratios?.find((r) => r.key === 'current')?.value ?? null;
  const nm = m.ratios?.find((r) => r.key === 'netMargin')?.value ?? null;
  const valScore = comps.find((c) => c.key === 'valuation')?.score ?? null;

  addCat('undervalued', 'Undervalued (research candidates)', [
    crit('Priced below sector peers', valScore, (v) => v >= 60, () => `P/E ${f1(m.pe)}x, P/B ${f1(m.pb)}x vs sector medians ${f1(pM)}x / ${f1(bM)}x`),
    crit('Financial health at least Strong', m.health?.score ?? null, (v) => v >= 65, (v) => `Health score ${f1(v, 0)}`),
    crit('Positive free cash flow', fcf, (v) => v > 0, (v) => `Free cash flow ${v.toLocaleString()}`),
    f?.isFinancial ? { text: 'Reasonable debt', status: 'no-data' as const, evidence: 'Not applied to financial institutions' } : crit('Debt-to-equity at or below 1.0x', de, (v) => v <= 1, (v) => `${f1(v, 2)}x`),
    crit('Profitable', nm, (v) => v > 0, (v) => `Net margin ${f1(v)}%`),
  ], false, 2, 0);
  addCat('growth', 'Growth', [
    crit('Revenue growth of 8% or more', m.revenueGrowth, (v) => v >= 8, (v) => `${f1(v)}%`),
    crit('Earnings growth of 10% or more', m.earningsGrowth, (v) => v >= 10, (v) => `${f1(v)}%`),
    crit('Return on equity of 12% or more', m.roe, (v) => v >= 12, (v) => `${f1(v)}%`),
    crit('EPS higher than the prior year', cur && prev && cur.eps != null && prev.eps != null ? cur.eps - prev.eps : null, (v) => v > 0, (v) => `Change ${f1(v, 3)}`),
  ]);
  const dpsYears = annual.filter((p) => (p.dividendsPerShare ?? 0) > 0).length;
  addCat('dividend', 'Dividend', [
    crit('Yield of 3% or more', m.dividendYield, (v) => v >= 3, (v) => `${f1(v)}%`),
    crit('Payout ratio between 0 and 80%', payout, (v) => v > 0 && v <= 80, (v) => `${f1(v, 0)}%`),
    crit('Dividends paid in at least 3 annual periods', f ? dpsYears : null, (v) => v >= 3, (v) => `${v} periods`),
    crit('Dividend not cut vs prior year', cur?.dividendsPerShare != null && prev?.dividendsPerShare != null ? cur.dividendsPerShare - prev.dividendsPerShare : null, (v) => v >= 0, (v) => `Change ${f1(v, 3)}`),
    crit('Free cash flow covers the dividend', fcf != null && cur?.dividendsPerShare != null && f?.sharesOutstanding ? fcf - cur.dividendsPerShare * f.sharesOutstanding : null, (v) => v >= 0, (v) => `Surplus ${v.toLocaleString()}`),
  ]);
  addCat('momentum', 'Momentum', [
    crit('3-month return positive', m.ret3M, (v) => v > 0, (v) => `${f1(v)}%`),
    crit('Above 50-day average', m.sma50 != null ? m.last - m.sma50 : null, (v) => v > 0, () => `Close ${f1(m.last, 3)} vs ${f1(m.sma50, 3)}`),
    crit('Above 200-day average', m.sma200 != null ? m.last - m.sma200 : null, (v) => v > 0, () => `Close ${f1(m.last, 3)} vs ${f1(m.sma200, 3)}`),
    crit('Beating the benchmark over 3 months', m.rel3M, (v) => v > 0, (v) => `${f1(v)} points`),
    crit('Latest volume at or above its 20-day average', m.volumeRatio, (v) => v >= 1, (v) => `${f1(v, 2)}x`),
  ]);
  addCat('recovery', 'Recovery', [
    crit('Net income higher than prior year', cur?.netIncome != null && prev?.netIncome != null ? cur.netIncome - prev.netIncome : null, (v) => v > 0, (v) => `Change ${v.toLocaleString()}`),
    crit('Net margin improved', cur?.netIncome != null && prev?.netIncome != null && cur.revenue && prev.revenue ? cur.netIncome / cur.revenue - prev.netIncome / prev.revenue : null, (v) => v > 0, (v) => `${f1(v * 100)} points`),
    f?.isFinancial ? { text: 'Debt reduced', status: 'no-data' as const, evidence: 'Not applied to financial institutions' } : crit('Debt-to-equity fell', cur?.totalDebt != null && cur.equity && prev?.totalDebt != null && prev.equity ? cur.totalDebt / cur.equity - prev.totalDebt / prev.equity : null, (v) => v < 0, (v) => `Change ${f1(v, 2)}x`),
    crit('Operating cash flow improved', cur?.operatingCashFlow != null && prev?.operatingCashFlow != null ? cur.operatingCashFlow - prev.operatingCashFlow : null, (v) => v > 0, (v) => `Change ${v.toLocaleString()}`),
  ], false, 2);
  addCat('warning', 'Financial warning signals', [
    crit('Earnings fell by 20% or more', m.earningsGrowth, (v) => v <= -20, (v) => `${f1(v)}%`),
    f?.isFinancial ? { text: 'Weak liquidity', status: 'no-data' as const, evidence: 'Not applied to financial institutions' } : crit('Current ratio below 1.0x', cr, (v) => v < 1, (v) => `${f1(v, 2)}x`),
    f?.isFinancial ? { text: 'Excessive debt', status: 'no-data' as const, evidence: 'Not applied to financial institutions' } : crit('Debt-to-equity above 2.0x', de, (v) => v > 2, (v) => `${f1(v, 2)}x`),
    crit('Negative operating cash flow', cur?.operatingCashFlow ?? null, (v) => v < 0, (v) => v.toLocaleString()),
    crit('Net losses in the last two annual periods', annual.length >= 2 && cur?.netIncome != null && prev?.netIncome != null ? Math.max(cur.netIncome, prev.netIncome) : null, (v) => v < 0, () => 'Both periods negative'),
    crit('Health score below 35', m.health?.score ?? null, (v) => v < 35, (v) => `Score ${f1(v, 0)}`),
  ], true);

  return { metrics: m, components: comps, score, coverage, categories: cats };
}
