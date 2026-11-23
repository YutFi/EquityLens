import { freeCashFlowOf, periodsOf, type Fundamentals, type StatementPeriod } from '../core/fundamentals';

export type RatioKey =
  | 'pe' | 'pb' | 'ps' | 'peg' | 'evEbitda' | 'roe' | 'roa' | 'roic' | 'debtEquity' | 'current' | 'quick'
  | 'grossMargin' | 'operatingMargin' | 'netMargin' | 'dividendYield' | 'revenueGrowth' | 'earningsGrowth' | 'payout' | 'fcfMargin';

export interface Ratio {
  key: RatioKey;
  label: string;
  value: number | null;
  unit: 'x' | '%';
  formula: string;
  /** Which statement period the figures come from. */
  period: string | null;
  /** Why the value is blank or what to be careful of. Never left empty when value is null. */
  note: string | null;
}

export interface RatioInput {
  fundamentals: Fundamentals;
  /** Latest market price; null when no price is loaded. */
  price: number | null;
  /** Assumed tax rate for NOPAT in ROIC (Malaysian statutory corporate rate is 24%). */
  taxRate?: number;
}

const NA_FINANCIAL = 'Not applicable to banks and other financial institutions, whose balance sheets work differently.';
const FINANCIAL_SKIP: RatioKey[] = ['debtEquity', 'current', 'quick', 'evEbitda', 'grossMargin', 'roic'];

const label = (p: StatementPeriod) => `${p.kind === 'annual' ? 'FY' : 'Q'} ending ${p.periodEnd}`;
const avg = (a: number | undefined, b: number | undefined): number | undefined => (a != null && b != null ? (a + b) / 2 : a);

/** Latest per-share earnings: reported EPS, else net income / shares. */
export function epsOf(p: StatementPeriod, shares: number | null): number | null {
  if (p.eps != null) return p.eps;
  if (p.netIncome != null && shares && shares > 0) return p.netIncome / shares;
  return null;
}

export function marketCap(f: Fundamentals, price: number | null): number | null {
  return price != null && f.sharesOutstanding && f.sharesOutstanding > 0 ? price * f.sharesOutstanding : null;
}

/**
 * Ratios from the latest ANNUAL period (quarterly figures are never annualised or mixed in).
 * A ratio that would be meaningless (negative earnings, zero denominators, missing inputs) is
 * returned with value null and a plain-language reason instead of a misleading number.
 */
export function computeRatios({ fundamentals: f, price, taxRate = 0.24 }: RatioInput): Ratio[] {
  const annual = periodsOf(f, 'annual');
  const cur = annual[annual.length - 1];
  const prev = annual.length > 1 ? annual[annual.length - 2] : undefined;
  const out: Ratio[] = [];

  const add = (key: RatioKey, lbl: string, unit: 'x' | '%', formula: string, value: number | null, note: string | null, usePeriod = true) => {
    const isFin = f.isFinancial && FINANCIAL_SKIP.includes(key);
    out.push({
      key, label: lbl, unit, formula,
      value: isFin ? null : value,
      period: cur && usePeriod ? label(cur) : null,
      note: isFin ? NA_FINANCIAL : value == null ? note ?? 'Not enough data to calculate.' : note,
    });
  };

  if (!cur) {
    return (['pe', 'pb', 'ps', 'roe', 'roa', 'netMargin'] as RatioKey[]).map((k) => ({
      key: k, label: k.toUpperCase(), value: null, unit: 'x' as const, formula: '', period: null, note: 'No annual financial statements loaded.',
    }));
  }

  const shares = f.sharesOutstanding;
  const eps = epsOf(cur, shares);
  const cap = marketCap(f, price);
  const needPrice = price == null ? 'No price loaded for this company.' : null;

  // Valuation multiples
  add('pe', 'P/E', 'x', 'Price ÷ earnings per share', price != null && eps != null && eps > 0 ? price / eps : null,
    needPrice ?? (eps == null ? 'Earnings per share unavailable (enter EPS, or net income and shares outstanding).' : eps <= 0 ? 'Earnings are zero or negative, so P/E is not meaningful.' : null));

  const bvps = cur.equity != null && shares ? cur.equity / shares : null;
  add('pb', 'P/B', 'x', 'Price ÷ book value per share (equity ÷ shares)', price != null && bvps != null && bvps > 0 ? price / bvps : null,
    needPrice ?? (bvps == null ? 'Needs shareholders\' equity and shares outstanding.' : 'Book value is zero or negative, so P/B is not meaningful.'));

  const sps = cur.revenue != null && shares ? cur.revenue / shares : null;
  add('ps', 'P/S', 'x', 'Price ÷ revenue per share', price != null && sps != null && sps > 0 ? price / sps : null,
    needPrice ?? 'Needs revenue and shares outstanding.');

  const prevEps = prev ? epsOf(prev, shares) : null;
  const epsGrowth = eps != null && prevEps != null && prevEps > 0 ? ((eps - prevEps) / prevEps) * 100 : null;
  const pe = out.find((r) => r.key === 'pe')?.value ?? null;
  add('peg', 'PEG', 'x', 'P/E ÷ annual earnings growth (%)', pe != null && epsGrowth != null && epsGrowth > 0 ? pe / epsGrowth : null,
    pe == null ? 'Needs a meaningful P/E.' : epsGrowth == null ? 'Needs two annual periods with positive earnings.' : 'Earnings growth is zero or negative, so PEG is not meaningful.');

  const ev = cap != null && cur.totalDebt != null && cur.cash != null ? cap + cur.totalDebt - cur.cash : null;
  add('evEbitda', 'EV/EBITDA', 'x', '(Market cap + total debt − cash) ÷ EBITDA', ev != null && cur.ebitda != null && cur.ebitda > 0 ? ev / cur.ebitda : null,
    ev == null ? 'Needs price, shares outstanding, total debt and cash.' : cur.ebitda == null ? 'EBITDA not provided.' : 'EBITDA is zero or negative, so the multiple is not meaningful.');

  // Returns (average balances where the prior year is available)
  const eqAvg = avg(cur.equity, prev?.equity);
  add('roe', 'ROE', '%', 'Net income ÷ average shareholders\' equity', cur.netIncome != null && eqAvg != null && eqAvg > 0 ? (cur.netIncome / eqAvg) * 100 : null,
    cur.netIncome == null || eqAvg == null ? 'Needs net income and equity.' : 'Equity is zero or negative, so ROE is not meaningful.');
  const aAvg = avg(cur.totalAssets, prev?.totalAssets);
  add('roa', 'ROA', '%', 'Net income ÷ average total assets', cur.netIncome != null && aAvg != null && aAvg > 0 ? (cur.netIncome / aAvg) * 100 : null, 'Needs net income and total assets.');
  const investedNow = cur.totalDebt != null && cur.equity != null ? cur.totalDebt + cur.equity - (cur.cash ?? 0) : null;
  add('roic', 'ROIC', '%', `Operating income × (1 − ${Math.round(taxRate * 100)}% assumed tax) ÷ (debt + equity − cash)`,
    cur.operatingIncome != null && investedNow != null && investedNow > 0 ? ((cur.operatingIncome * (1 - taxRate)) / investedNow) * 100 : null,
    'Needs operating income, total debt, equity and cash. The tax rate is an assumption, not a reported figure.');

  // Leverage and liquidity
  add('debtEquity', 'Debt-to-equity', 'x', 'Total debt ÷ shareholders\' equity', cur.totalDebt != null && cur.equity != null && cur.equity > 0 ? cur.totalDebt / cur.equity : null,
    cur.equity != null && cur.equity <= 0 ? 'Equity is zero or negative, so the ratio is not meaningful.' : 'Needs total debt and equity.');
  add('current', 'Current ratio', 'x', 'Current assets ÷ current liabilities', cur.currentAssets != null && cur.currentLiabilities != null && cur.currentLiabilities > 0 ? cur.currentAssets / cur.currentLiabilities : null, 'Needs current assets and current liabilities.');
  add('quick', 'Quick ratio', 'x', '(Current assets − inventory) ÷ current liabilities', cur.currentAssets != null && cur.inventory != null && cur.currentLiabilities != null && cur.currentLiabilities > 0 ? (cur.currentAssets - cur.inventory) / cur.currentLiabilities : null, 'Needs current assets, inventory and current liabilities.');

  // Margins
  const gp = cur.grossProfit ?? (cur.revenue != null && cur.costOfRevenue != null ? cur.revenue - cur.costOfRevenue : undefined);
  add('grossMargin', 'Gross margin', '%', 'Gross profit ÷ revenue', gp != null && cur.revenue ? (gp / cur.revenue) * 100 : null, 'Needs revenue and gross profit (or cost of revenue).');
  add('operatingMargin', 'Operating margin', '%', 'Operating income ÷ revenue', cur.operatingIncome != null && cur.revenue ? (cur.operatingIncome / cur.revenue) * 100 : null, 'Needs revenue and operating income.');
  add('netMargin', 'Net profit margin', '%', 'Net income ÷ revenue', cur.netIncome != null && cur.revenue ? (cur.netIncome / cur.revenue) * 100 : null, 'Needs revenue and net income.');
  const fcf = freeCashFlowOf(cur);
  add('fcfMargin', 'Free cash flow margin', '%', 'Free cash flow ÷ revenue', fcf != null && cur.revenue ? (fcf / cur.revenue) * 100 : null, 'Needs revenue and free cash flow (or operating cash flow and capex).');

  // Income
  add('dividendYield', 'Dividend yield', '%', 'Dividends per share ÷ price', price != null && cur.dividendsPerShare != null && price > 0 ? (cur.dividendsPerShare / price) * 100 : null,
    needPrice ?? 'Dividends per share not provided.');
  add('payout', 'Payout ratio', '%', 'Dividends per share ÷ earnings per share', cur.dividendsPerShare != null && eps != null && eps > 0 ? (cur.dividendsPerShare / eps) * 100 : null,
    eps != null && eps <= 0 ? 'Earnings are zero or negative, so the payout ratio is not meaningful.' : 'Needs dividends per share and earnings per share.');

  // Growth
  add('revenueGrowth', 'Revenue growth', '%', '(Revenue − prior-year revenue) ÷ prior-year revenue',
    cur.revenue != null && prev?.revenue != null && prev.revenue > 0 ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : null, 'Needs revenue for two consecutive annual periods.');
  add('earningsGrowth', 'Earnings growth', '%', '(Net income − prior-year net income) ÷ |prior-year net income|',
    cur.netIncome != null && prev?.netIncome != null && prev.netIncome > 0 ? ((cur.netIncome - prev.netIncome) / prev.netIncome) * 100 : null,
    prev?.netIncome != null && prev.netIncome <= 0 ? 'Prior-year earnings were zero or negative, so a growth percentage is not meaningful.' : 'Needs net income for two consecutive annual periods.');

  return out;
}

export const ratioValue = (ratios: Ratio[], key: RatioKey): number | null => ratios.find((r) => r.key === key)?.value ?? null;

/** Compound annual growth between the first and last positive values, or null. */
export function cagr(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2 || v[0] <= 0 || v[v.length - 1] <= 0) return null;
  return (Math.pow(v[v.length - 1] / v[0], 1 / (v.length - 1)) - 1) * 100;
}
