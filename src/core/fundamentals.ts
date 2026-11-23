/**
 * Company financial data model. In this build there is no automatic statements feed, so every
 * figure here was entered or imported by the user and is labelled as such. Amounts are stored in
 * full currency units (the import step converts from thousands/millions).
 */

export type StatementKind = 'annual' | 'quarterly';

export const STATEMENT_FIELDS = [
  'revenue', 'costOfRevenue', 'grossProfit', 'operatingExpenses', 'operatingIncome', 'ebitda', 'interestExpense',
  'netIncome', 'eps', 'dividendsPerShare',
  'totalAssets', 'currentAssets', 'inventory', 'totalLiabilities', 'currentLiabilities', 'totalDebt', 'equity', 'cash',
  'operatingCashFlow', 'investingCashFlow', 'financingCashFlow', 'capex', 'freeCashFlow',
] as const;
export type StatementField = (typeof STATEMENT_FIELDS)[number];

export const FIELD_LABELS: Record<StatementField, string> = {
  revenue: 'Revenue', costOfRevenue: 'Cost of revenue', grossProfit: 'Gross profit', operatingExpenses: 'Operating expenses',
  operatingIncome: 'Operating income', ebitda: 'EBITDA', interestExpense: 'Interest expense', netIncome: 'Net income',
  eps: 'Earnings per share', dividendsPerShare: 'Dividends per share', totalAssets: 'Total assets', currentAssets: 'Current assets',
  inventory: 'Inventory', totalLiabilities: 'Total liabilities', currentLiabilities: 'Current liabilities', totalDebt: 'Total debt',
  equity: "Shareholders' equity", cash: 'Cash and equivalents', operatingCashFlow: 'Operating cash flow',
  investingCashFlow: 'Investing cash flow', financingCashFlow: 'Financing cash flow', capex: 'Capital expenditure',
  freeCashFlow: 'Free cash flow',
};

/** Fields that are per-share amounts (not scaled by the import unit). */
export const PER_SHARE_FIELDS: StatementField[] = ['eps', 'dividendsPerShare'];

export type StatementPeriod = {
  /** Period end date, YYYY-MM-DD. */
  periodEnd: string;
  kind: StatementKind;
} & Partial<Record<StatementField, number>>;

export interface Fundamentals {
  securityId: string;
  currency: string;
  /** Shares outstanding (units). Needed for market cap and per-share valuation. */
  sharesOutstanding: number | null;
  /** Banks, insurers and similar: industrial leverage and liquidity ratios do not apply. */
  isFinancial: boolean;
  periods: StatementPeriod[];
  source: string;
  loadedAt: string;
  notes: string[];
}

/** Periods of one kind, oldest first. */
export function periodsOf(f: Fundamentals, kind: StatementKind): StatementPeriod[] {
  return f.periods.filter((p) => p.kind === kind).sort((a, b) => (a.periodEnd < b.periodEnd ? -1 : 1));
}

/**
 * Free cash flow: the reported figure when supplied, otherwise operating cash flow minus capital
 * expenditure (capex is accepted as either a positive outflow or a negative number).
 */
export function freeCashFlowOf(p: StatementPeriod): number | null {
  if (p.freeCashFlow != null) return p.freeCashFlow;
  if (p.operatingCashFlow != null && p.capex != null) return p.operatingCashFlow - Math.abs(p.capex);
  return null;
}
