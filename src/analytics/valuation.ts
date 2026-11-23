import { freeCashFlowOf, periodsOf, type Fundamentals } from '../core/fundamentals';
import type { Bar } from '../core/types';
import { closeOnOrBefore } from './returns';
import { cagr, epsOf } from './ratios';

/**
 * Valuation engine. Every output is an ESTIMATE under stated assumptions, never a market price.
 * Nothing here is a recommendation. Each method states when it does not apply instead of forcing a number.
 */

export type AssumptionSource = 'default assumption' | 'derived from your statements' | 'you set';

export interface Assumption {
  key: string;
  label: string;
  value: number;
  unit: '%' | 'years' | 'x' | 'RM';
  source: AssumptionSource;
  help: string;
}

export interface ValuationMethod {
  id: 'dcf' | 'relative-peers' | 'relative-history' | 'ddm' | 'bank-pb';
  name: string;
  applicable: boolean;
  /** Why the method is unavailable or unsuitable (always set when applicable is false). */
  reason: string | null;
  /** Per-share estimates. */
  conservative: number | null;
  base: number | null;
  optimistic: number | null;
  assumptions: Assumption[];
  limitations: string[];
}

export const median = (a: number[]): number | null => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ---------- DCF ----------

export interface DcfInput {
  baseFcf: number;
  growthPct: number;
  years: number;
  terminalGrowthPct: number;
  discountRatePct: number;
  shares: number;
}
export type DcfOutput =
  | { ok: true; perShare: number; equityValue: number; pvExplicit: number; pvTerminal: number; terminalShare: number }
  | { ok: false; reason: string };

/**
 * Simplified free-cash-flow-to-equity DCF: grow free cash flow for `years`, add a Gordon terminal
 * value, discount at the chosen rate, divide by shares. It does not model changes in debt or cash.
 */
export function dcf(i: DcfInput): DcfOutput {
  const r = i.discountRatePct / 100;
  const g = i.growthPct / 100;
  const tg = i.terminalGrowthPct / 100;
  if (!(i.shares > 0)) return { ok: false, reason: 'Shares outstanding are needed to value per share.' };
  if (!(i.baseFcf > 0)) return { ok: false, reason: 'Free cash flow is zero or negative, so a DCF is not meaningful.' };
  if (r <= tg) return { ok: false, reason: 'The discount rate must be higher than terminal growth, otherwise the terminal value is undefined.' };
  if (i.years < 1) return { ok: false, reason: 'Use at least one forecast year.' };
  let pv = 0;
  let cf = i.baseFcf;
  for (let y = 1; y <= i.years; y++) {
    cf *= 1 + g;
    pv += cf / Math.pow(1 + r, y);
  }
  const tv = (cf * (1 + tg)) / (r - tg);
  const pvTv = tv / Math.pow(1 + r, i.years);
  const equityValue = pv + pvTv;
  return { ok: true, perShare: equityValue / i.shares, equityValue, pvExplicit: pv, pvTerminal: pvTv, terminalShare: pvTv / equityValue };
}

// ---------- Dividend discount ----------

/** Gordon growth: next year's dividend ÷ (r − g). */
export function gordon(dps: number, growthPct: number, discountRatePct: number): number | null {
  const r = discountRatePct / 100;
  const g = growthPct / 100;
  if (!(dps > 0) || r <= g) return null;
  return (dps * (1 + g)) / (r - g);
}

/** Justified price-to-book for a bank: (ROE − g) ÷ (r − g). */
export function justifiedPb(roePct: number, growthPct: number, discountRatePct: number): number | null {
  const r = discountRatePct / 100;
  const g = growthPct / 100;
  if (r <= g) return null;
  return (roePct / 100 - g) / (r - g);
}

// ---------- Combined engine ----------

export interface PeerMultiples { pe: number[]; pb: number[]; ps: number[] }

export interface ValuationInput {
  fundamentals: Fundamentals;
  price: number | null;
  bars: Bar[];
  peers: PeerMultiples;
  /** User overrides (percent / years). Unset values use derived or default assumptions. */
  overrides?: Partial<{ discountRate: number; terminalGrowth: number; growth: number; years: number; dividendGrowth: number }>;
}

export interface ValuationResult {
  methods: ValuationMethod[];
  /** Median of the applicable methods' base estimates, or null. A summary of estimates, not a price. */
  fairValue: number | null;
  conservative: number | null;
  optimistic: number | null;
  price: number | null;
  upsidePct: number | null;
  /** (fair value − price) ÷ fair value. Positive means the price is below the estimate. */
  marginOfSafetyPct: number | null;
  assumptions: Assumption[];
  warnings: string[];
}

const DEFAULTS = { discountRate: 10, terminalGrowth: 3, years: 5, fallbackGrowth: 3 };

export function runValuation(inp: ValuationInput): ValuationResult {
  const f = inp.fundamentals;
  const annual = periodsOf(f, 'annual');
  const last = annual[annual.length - 1];
  const o = inp.overrides ?? {};
  const warnings: string[] = [];
  const shares = f.sharesOutstanding;

  const src = (set: number | undefined, derived: boolean): AssumptionSource => (set != null ? 'you set' : derived ? 'derived from your statements' : 'default assumption');
  const discountRate = o.discountRate ?? DEFAULTS.discountRate;
  const terminalGrowth = Math.min(o.terminalGrowth ?? DEFAULTS.terminalGrowth, discountRate - 0.5);
  const years = o.years ?? DEFAULTS.years;
  const revCagr = cagr(annual.map((p) => p.revenue).filter((x): x is number => x != null));
  const derivedGrowth = revCagr != null ? Math.max(0, Math.min(8, revCagr)) : null;
  const growth = o.growth ?? derivedGrowth ?? DEFAULTS.fallbackGrowth;

  const A: Record<string, Assumption> = {
    discountRate: { key: 'discountRate', label: 'Discount rate (required return)', value: discountRate, unit: '%', source: src(o.discountRate, false), help: 'The annual return you require. Higher means a lower estimate. 10% is a placeholder, not a market-derived cost of equity.' },
    terminalGrowth: { key: 'terminalGrowth', label: 'Terminal growth', value: terminalGrowth, unit: '%', source: src(o.terminalGrowth, false), help: 'Long-run growth after the forecast years. Keep it at or below long-run economic growth.' },
    growth: { key: 'growth', label: 'Cash-flow growth (forecast years)', value: growth, unit: '%', source: src(o.growth, derivedGrowth != null), help: derivedGrowth != null ? `Revenue growth per year across your loaded annual periods, capped to 0-8%.` : 'No usable revenue history, so a placeholder is used.' },
    years: { key: 'years', label: 'Forecast years', value: years, unit: 'years', source: src(o.years, false), help: 'Years of explicit cash-flow growth before the terminal value.' },
  };
  const assumptions = [A.discountRate, A.terminalGrowth, A.growth, A.years];
  const methods: ValuationMethod[] = [];

  const price = inp.price;
  const eps = last ? epsOf(last, shares) : null;
  const bvps = last?.equity != null && shares ? last.equity / shares : null;
  const sps = last?.revenue != null && shares ? last.revenue / shares : null;

  // --- DCF
  {
    const fcf = last ? freeCashFlowOf(last) : null;
    const m: ValuationMethod = { id: 'dcf', name: 'Discounted cash flow', applicable: true, reason: null, conservative: null, base: null, optimistic: null, assumptions, limitations: [
      'Highly sensitive to the growth and discount rate; small changes move the result a lot.',
      'Terminal value usually makes up most of the estimate (shown below).',
      'Simplified: uses free cash flow to equity and does not model changes in debt or cash.',
    ] };
    if (f.isFinancial) { m.applicable = false; m.reason = 'Cash-flow DCF does not suit banks and other financial institutions (cash flow is part of their operations). Use the justified P/B and dividend methods instead.'; }
    else if (fcf == null) { m.applicable = false; m.reason = 'Needs free cash flow (or operating cash flow and capex) for the latest annual period.'; }
    else if (!shares) { m.applicable = false; m.reason = 'Needs shares outstanding.'; }
    else {
      const run = (dr: number, g: number, tg: number) => dcf({ baseFcf: fcf, growthPct: g, years, terminalGrowthPct: Math.min(tg, dr - 0.5), discountRatePct: dr, shares });
      const base = run(discountRate, growth, terminalGrowth);
      if (!base.ok) { m.applicable = false; m.reason = base.reason; }
      else {
        const cons = run(discountRate + 1, Math.max(0, growth - 3), terminalGrowth - 0.5);
        const opt = run(Math.max(discountRate - 1, 1), growth + 3, terminalGrowth + 0.5);
        m.base = base.perShare;
        m.conservative = cons.ok ? cons.perShare : null;
        m.optimistic = opt.ok ? opt.perShare : null;
        m.limitations.push(`Terminal value is ${Math.round(base.terminalShare * 100)}% of the base estimate.`);
      }
    }
    methods.push(m);
  }

  // --- Relative valuation against loaded peers
  {
    const peerSet: { id: 'pe' | 'pb' | 'ps'; label: string; metric: number | null }[] = [
      { id: 'pe', label: 'P/E', metric: eps != null && eps > 0 ? eps : null },
      { id: 'pb', label: 'P/B', metric: bvps != null && bvps > 0 ? bvps : null },
      { id: 'ps', label: 'P/S', metric: sps != null && sps > 0 && !f.isFinancial ? sps : null },
    ];
    const used = peerSet.filter((p) => p.metric != null && inp.peers[p.id].length >= 3);
    const m: ValuationMethod = { id: 'relative-peers', name: 'Relative valuation (loaded peers)', applicable: used.length > 0, reason: null, conservative: null, base: null, optimistic: null, assumptions: [], limitations: [
      'Peers are only the companies YOU have loaded in the same sector, not a curated peer group.',
      'A company can look cheap versus peers for good reasons (lower growth, higher risk).',
    ] };
    if (!used.length) m.reason = 'Needs at least 3 other companies in the same sector with financial statements loaded, and this company\'s earnings, book value or sales per share.';
    else {
      const estimates = used.map((p) => {
        const s = [...inp.peers[p.id]].sort((a, b) => a - b);
        const q = (x: number) => s[Math.min(s.length - 1, Math.max(0, Math.round(x * (s.length - 1))))];
        return { lo: q(0.25) * (p.metric as number), mid: (median(s) as number) * (p.metric as number), hi: q(0.75) * (p.metric as number), label: `${p.label}: peer median ${(median(s) as number).toFixed(2)}x (${s.length} peers)` };
      });
      m.conservative = median(estimates.map((e) => e.lo));
      m.base = median(estimates.map((e) => e.mid));
      m.optimistic = median(estimates.map((e) => e.hi));
      m.assumptions = estimates.map((e, i) => ({ key: `peer${i}`, label: e.label, value: e.mid, unit: 'RM', source: 'derived from your statements', help: 'Implied value per share from the peer median multiple (conservative and optimistic use the 25th and 75th percentile).' }));
    }
    methods.push(m);
  }

  // --- Own historical multiple (P/E at each year end)
  {
    const m: ValuationMethod = { id: 'relative-history', name: 'Relative valuation (own history)', applicable: false, reason: null, conservative: null, base: null, optimistic: null, assumptions: [], limitations: [
      'Past multiples reflect past conditions and may not return.',
      'Uses the closing price on or before each period end.',
    ] };
    const pes: number[] = [];
    for (const p of annual) {
      const e = epsOf(p, shares);
      if (e == null || e <= 0 || !inp.bars.length || inp.bars[0].t > p.periodEnd) continue;
      const px = closeOnOrBefore(inp.bars, p.periodEnd);
      if (px != null) pes.push(px / e);
    }
    if (pes.length >= 3 && eps != null && eps > 0) {
      const s = [...pes].sort((a, b) => a - b);
      m.applicable = true;
      m.base = (median(s) as number) * eps;
      m.conservative = s[0] * eps;
      m.optimistic = s[s.length - 1] * eps;
      m.assumptions = [{ key: 'histPe', label: `Median P/E at ${pes.length} past year-ends`, value: median(s) as number, unit: 'x', source: 'derived from your statements', help: 'Conservative and optimistic use the lowest and highest year-end P/E.' }];
    } else m.reason = 'Needs price history reaching back to at least three annual period ends with positive earnings.';
    methods.push(m);
  }

  // --- Dividend discount
  {
    const dpsSeries = annual.map((p) => p.dividendsPerShare).filter((x): x is number => x != null && x > 0);
    const dps = last?.dividendsPerShare ?? null;
    const histG = cagr(dpsSeries);
    const derivedG = histG != null ? Math.max(0, Math.min(5, histG)) : null;
    const g = Math.min(o.dividendGrowth ?? derivedG ?? 2, terminalGrowth);
    const m: ValuationMethod = { id: 'ddm', name: 'Dividend discount model', applicable: false, reason: null, conservative: null, base: null, optimistic: null, assumptions: [
      A.discountRate,
      { key: 'dividendGrowth', label: 'Dividend growth', value: g, unit: '%', source: src(o.dividendGrowth, derivedG != null), help: 'Capped at the terminal growth rate so the model stays valid.' },
    ], limitations: [
      'Only suitable for companies that pay steady dividends.',
      'Very sensitive to the gap between the discount rate and dividend growth.',
    ] };
    if (dpsSeries.length < 3 || dps == null || dps <= 0) m.reason = 'Needs dividends per share in at least three annual periods, including the latest.';
    else {
      const base = gordon(dps, g, discountRate);
      if (base == null) m.reason = 'The discount rate must exceed dividend growth.';
      else {
        m.applicable = true;
        m.base = base;
        m.conservative = gordon(dps, Math.max(0, g - 1), discountRate + 1);
        m.optimistic = gordon(dps, g + 1, Math.max(discountRate - 1, g + 1.5));
      }
    }
    methods.push(m);
  }

  // --- Bank: justified P/B
  {
    const roeSeries = annual.map((p, i) => {
      const prev = annual[i - 1];
      const eq = p.equity != null && prev?.equity != null ? (p.equity + prev.equity) / 2 : p.equity;
      return p.netIncome != null && eq && eq > 0 ? (p.netIncome / eq) * 100 : null;
    }).filter((x): x is number => x != null);
    const roe = roeSeries.length ? roeSeries[roeSeries.length - 1] : null;
    const m: ValuationMethod = { id: 'bank-pb', name: 'Justified price-to-book (banks)', applicable: false, reason: null, conservative: null, base: null, optimistic: null, assumptions: [A.discountRate, A.terminalGrowth], limitations: [
      'Assumes the latest ROE persists; bank returns move with credit cycles and rates.',
      'Book value is as reported and not adjusted for asset-quality problems.',
    ] };
    if (!f.isFinancial) m.reason = 'Only applied to companies marked as financial institutions.';
    else if (roe == null || bvps == null || bvps <= 0) m.reason = 'Needs net income, equity and shares outstanding.';
    else {
      const base = justifiedPb(roe, terminalGrowth, discountRate);
      if (base == null) m.reason = 'The discount rate must exceed growth.';
      else {
        m.applicable = true;
        m.base = Math.max(0, base) * bvps;
        m.conservative = Math.max(0, justifiedPb(roe - 2, terminalGrowth - 0.5, discountRate + 1) ?? 0) * bvps;
        m.optimistic = Math.max(0, justifiedPb(roe + 2, terminalGrowth + 0.5, Math.max(discountRate - 1, terminalGrowth + 1.5)) ?? 0) * bvps;
        m.assumptions = [...m.assumptions, { key: 'roe', label: 'Return on equity used', value: roe, unit: '%', source: 'derived from your statements', help: 'Latest annual ROE (average equity where the prior year is loaded).' }];
      }
    }
    methods.push(m);
  }

  const ok = methods.filter((m) => m.applicable && m.base != null);
  const fair = median(ok.map((m) => m.base as number));
  const cons = median(ok.map((m) => (m.conservative ?? m.base) as number));
  const opt = median(ok.map((m) => (m.optimistic ?? m.base) as number));
  if (!ok.length) warnings.push('No valuation method could be applied with the data loaded. Add annual statements, shares outstanding and (for peers) more companies.');
  if (ok.length === 1) warnings.push('Only one method applies, so there is no cross-check. Treat the estimate with extra caution.');
  if (fair != null && ok.length > 1) {
    const lo = Math.min(...ok.map((m) => m.base as number));
    const hi = Math.max(...ok.map((m) => m.base as number));
    if (hi > lo * 1.5) warnings.push('The methods disagree widely (the highest is more than 1.5x the lowest). That disagreement is itself information about how uncertain the value is.');
  }

  return {
    methods, fairValue: fair, conservative: cons, optimistic: opt, price,
    upsidePct: fair != null && price != null && price > 0 ? ((fair - price) / price) * 100 : null,
    marginOfSafetyPct: fair != null && price != null && fair > 0 ? ((fair - price) / fair) * 100 : null,
    assumptions, warnings,
  };
}
