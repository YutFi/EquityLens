import { freeCashFlowOf, periodsOf, type Fundamentals } from '../core/fundamentals';
import { computeRatios, ratioValue } from './ratios';

export type HealthClass = 'Excellent' | 'Strong' | 'Moderate' | 'Weak' | 'High risk' | 'Insufficient data';

export interface HealthComponent {
  key: string;
  label: string;
  weight: number;
  /** 0-100, or null when the inputs needed are missing (missing data is never scored as poor). */
  score: number | null;
  /** Plain-language reason for the score, always naming the figures used. */
  explanation: string;
  inputs: { name: string; value: string }[];
  applicable: boolean;
}

export interface HealthResult {
  score: number | null;
  classification: HealthClass;
  /** Share of total weight that could be evaluated, 0-100. */
  coverage: number;
  components: HealthComponent[];
  notes: string[];
}

/** Linear map: `bad` -> 0, `good` -> 100, clamped. Works for either direction. */
export function scale(x: number, bad: number, good: number): number {
  if (good === bad) return 50;
  const t = (x - bad) / (good - bad);
  return Math.max(0, Math.min(1, t)) * 100;
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a: number[]) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
const fmt = (n: number, d = 1) => n.toFixed(d);

const WEIGHTS = { revenue: 15, profit: 20, cash: 15, debt: 15, liquidity: 10, earnings: 10, returns: 15 };

export function classify(score: number): Exclude<HealthClass, 'Insufficient data'> {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Strong';
  if (score >= 50) return 'Moderate';
  if (score >= 35) return 'Weak';
  return 'High risk';
}

/**
 * Transparent 0-100 financial health score from annual statements the user supplied.
 * Components that cannot be evaluated are excluded and the remaining weights are re-normalised,
 * so missing information is never counted as bad performance. With less than half of the weight
 * evaluable the result is "Insufficient data" instead of a score. Banks and other financial
 * institutions skip the industrial leverage and liquidity components.
 */
export function assessHealth(f: Fundamentals, price: number | null = null): HealthResult {
  const annual = periodsOf(f, 'annual');
  const ratios = computeRatios({ fundamentals: f, price });
  const comps: HealthComponent[] = [];
  const notes: string[] = [];

  // 1. Revenue consistency
  {
    const revs = annual.map((p) => p.revenue).filter((x): x is number => x != null);
    let score: number | null = null;
    let explanation = 'Needs revenue for at least three annual periods.';
    const inputs: HealthComponent['inputs'] = [{ name: 'Annual periods with revenue', value: String(revs.length) }];
    if (revs.length >= 3) {
      const g: number[] = [];
      for (let i = 1; i < revs.length; i++) if (revs[i - 1] > 0) g.push(((revs[i] - revs[i - 1]) / revs[i - 1]) * 100);
      const up = g.filter((x) => x > 0).length / g.length;
      const volat = sd(g);
      score = 0.6 * scale(up, 0.3, 1) + 0.4 * scale(volat, 25, 5);
      explanation = `Revenue rose in ${Math.round(up * 100)}% of years, with year-to-year growth swinging by about ${fmt(volat)} percentage points.`;
      inputs.push({ name: 'Years of growth', value: `${Math.round(up * 100)}%` }, { name: 'Growth volatility (sd, pp)', value: fmt(volat) });
    }
    comps.push({ key: 'revenue', label: 'Revenue consistency', weight: WEIGHTS.revenue, score, explanation, inputs, applicable: true });
  }

  // 2. Profitability
  {
    const nm = ratioValue(ratios, 'netMargin');
    const om = ratioValue(ratios, 'operatingMargin');
    let score: number | null = null;
    let explanation = 'Needs revenue and net income.';
    const inputs: HealthComponent['inputs'] = [];
    if (nm != null) {
      score = f.isFinancial || om == null ? scale(nm, 0, 25) : 0.6 * scale(nm, 0, 15) + 0.4 * scale(om, 0, 20);
      explanation = `Net margin ${fmt(nm)}%${om != null ? `, operating margin ${fmt(om)}%` : ''}. Higher margins score higher; zero or below scores zero.`;
      inputs.push({ name: 'Net margin', value: `${fmt(nm)}%` });
      if (om != null) inputs.push({ name: 'Operating margin', value: `${fmt(om)}%` });
    }
    comps.push({ key: 'profit', label: 'Profitability', weight: WEIGHTS.profit, score, explanation, inputs, applicable: true });
  }

  // 3. Cash flow quality
  {
    const last = annual[annual.length - 1];
    const fcf = last ? freeCashFlowOf(last) : null;
    let score: number | null = null;
    let explanation = 'Needs operating cash flow and net income (and ideally capital expenditure).';
    const inputs: HealthComponent['inputs'] = [];
    if (last?.operatingCashFlow != null && last.netIncome != null) {
      const conv = last.netIncome > 0 ? last.operatingCashFlow / last.netIncome : null;
      const parts: number[] = [];
      if (conv != null) parts.push(scale(conv, 0.4, 1.1));
      else parts.push(last.operatingCashFlow > 0 ? 50 : 0);
      if (fcf != null) parts.push(fcf > 0 ? 100 : 0);
      score = mean(parts);
      explanation = `Operating cash flow ${conv != null ? `was ${fmt(conv, 2)}x net income` : 'is compared with a non-positive net income'}${fcf != null ? `; free cash flow was ${fcf > 0 ? 'positive' : 'negative'}` : ''}.`;
      inputs.push({ name: 'Operating cash flow ÷ net income', value: conv != null ? `${fmt(conv, 2)}x` : 'n/a' }, { name: 'Free cash flow positive', value: fcf == null ? 'unknown' : fcf > 0 ? 'yes' : 'no' });
    }
    comps.push({ key: 'cash', label: 'Cash flow quality', weight: WEIGHTS.cash, score, explanation, inputs, applicable: true });
  }

  // 4. Debt management
  {
    const de = ratioValue(ratios, 'debtEquity');
    let score: number | null = null;
    let explanation = f.isFinancial ? 'Not applied to financial institutions.' : 'Needs total debt and shareholders\' equity.';
    const inputs: HealthComponent['inputs'] = [];
    const last = annual[annual.length - 1];
    if (!f.isFinancial && de != null) {
      score = scale(de, 2.5, 0.2);
      explanation = `Total debt is ${fmt(de, 2)}x equity. Lower is stronger; above 2.5x scores zero.`;
      inputs.push({ name: 'Debt-to-equity', value: `${fmt(de, 2)}x` });
      if (last?.operatingIncome != null && last.interestExpense != null && last.interestExpense > 0) {
        const cov = last.operatingIncome / last.interestExpense;
        score = 0.7 * score + 0.3 * scale(cov, 1, 8);
        explanation += ` Operating income covers interest ${fmt(cov)}x.`;
        inputs.push({ name: 'Interest cover', value: `${fmt(cov)}x` });
      }
    }
    comps.push({ key: 'debt', label: 'Debt management', weight: WEIGHTS.debt, score, explanation, inputs, applicable: !f.isFinancial });
  }

  // 5. Liquidity
  {
    const cr = ratioValue(ratios, 'current');
    let score: number | null = null;
    let explanation = f.isFinancial ? 'Not applied to financial institutions.' : 'Needs current assets and current liabilities.';
    const inputs: HealthComponent['inputs'] = [];
    if (!f.isFinancial && cr != null) {
      score = scale(cr, 0.6, 1.8);
      explanation = `Current assets cover current liabilities ${fmt(cr, 2)}x. Below 0.6x scores zero; 1.8x or more scores full marks.`;
      inputs.push({ name: 'Current ratio', value: `${fmt(cr, 2)}x` });
    }
    comps.push({ key: 'liquidity', label: 'Liquidity', weight: WEIGHTS.liquidity, score, explanation, inputs, applicable: !f.isFinancial });
  }

  // 6. Earnings consistency
  {
    const ni = annual.map((p) => p.netIncome).filter((x): x is number => x != null);
    let score: number | null = null;
    let explanation = 'Needs net income for at least three annual periods.';
    const inputs: HealthComponent['inputs'] = [{ name: 'Annual periods with net income', value: String(ni.length) }];
    if (ni.length >= 3) {
      const profitable = ni.filter((x) => x > 0).length / ni.length;
      const m = mean(ni);
      const cv = m !== 0 ? sd(ni) / Math.abs(m) : 5;
      score = 0.6 * scale(profitable, 0.4, 1) + 0.4 * scale(cv, 1, 0.1);
      explanation = `${Math.round(profitable * 100)}% of years were profitable, and earnings varied by about ${fmt(cv * 100, 0)}% of their average.`;
      inputs.push({ name: 'Profitable years', value: `${Math.round(profitable * 100)}%` }, { name: 'Variation (sd ÷ mean)', value: `${fmt(cv * 100, 0)}%` });
    }
    comps.push({ key: 'earnings', label: 'Earnings consistency', weight: WEIGHTS.earnings, score, explanation, inputs, applicable: true });
  }

  // 7. Return on capital
  {
    const roe = ratioValue(ratios, 'roe');
    const roic = ratioValue(ratios, 'roic');
    let score: number | null = null;
    let explanation = 'Needs net income and equity (and for industrial companies, operating income and debt).';
    const inputs: HealthComponent['inputs'] = [];
    if (roe != null || roic != null) {
      const parts: number[] = [];
      if (roe != null) { parts.push(scale(roe, 0, 18)); inputs.push({ name: 'ROE', value: `${fmt(roe)}%` }); }
      if (!f.isFinancial && roic != null) { parts.push(scale(roic, 0, 14)); inputs.push({ name: 'ROIC (assumed tax)', value: `${fmt(roic)}%` }); }
      score = mean(parts);
      explanation = `${roe != null ? `ROE ${fmt(roe)}%` : ''}${roe != null && !f.isFinancial && roic != null ? ', ' : ''}${!f.isFinancial && roic != null ? `ROIC ${fmt(roic)}%` : ''}. Returns of 18% (ROE) or 14% (ROIC) and above score full marks.`;
    }
    comps.push({ key: 'returns', label: 'Return on capital', weight: WEIGHTS.returns, score, explanation, inputs, applicable: true });
  }

  const usable = comps.filter((c) => c.applicable && c.score != null);
  const totalWeight = comps.filter((c) => c.applicable).reduce((a, c) => a + c.weight, 0);
  const usedWeight = usable.reduce((a, c) => a + c.weight, 0);
  const coverage = totalWeight ? (usedWeight / totalWeight) * 100 : 0;

  if (f.isFinancial) notes.push('Marked as a financial institution: leverage and liquidity components are skipped, and the remaining weights are re-normalised.');
  if (annual.length < 3) notes.push('Fewer than three annual periods are loaded, so consistency components cannot be evaluated.');

  if (usedWeight === 0 || coverage < 50) {
    notes.push(`Only ${Math.round(coverage)}% of the scoring weight could be evaluated, which is not enough for a score. Missing data is not treated as poor performance.`);
    return { score: null, classification: 'Insufficient data', coverage, components: comps, notes };
  }
  const score = usable.reduce((a, c) => a + (c.score as number) * c.weight, 0) / usedWeight;
  if (coverage < 100) notes.push(`Scored on ${Math.round(coverage)}% of the available weight; components without data were left out, not marked down.`);
  return { score, classification: classify(score), coverage, components: comps, notes };
}
