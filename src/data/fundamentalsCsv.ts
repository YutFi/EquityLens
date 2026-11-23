import { PER_SHARE_FIELDS, STATEMENT_FIELDS, type StatementField, type StatementKind, type StatementPeriod } from '../core/fundamentals';
import { detectDelimiter, parseDate, parseNumber, splitLine, type DateOrder } from './csv';

/**
 * Parser for company financial statements supplied as CSV. One row per period. Nothing is
 * repaired or invented: unreadable rows are rejected and reported, blank cells stay blank.
 */

const ALIASES: Record<StatementField, string[]> = {
  revenue: ['revenue', 'sales', 'totalrevenue', 'turnover'],
  costOfRevenue: ['costofrevenue', 'cogs', 'costofsales'],
  grossProfit: ['grossprofit'],
  operatingExpenses: ['operatingexpenses', 'opex'],
  operatingIncome: ['operatingincome', 'operatingprofit', 'ebit'],
  ebitda: ['ebitda'],
  interestExpense: ['interestexpense', 'financecost', 'financecosts'],
  netIncome: ['netincome', 'netprofit', 'profitaftertax', 'profitattributable'],
  eps: ['eps', 'earningspershare'],
  dividendsPerShare: ['dividendspershare', 'dps', 'dividendpershare', 'dividend'],
  totalAssets: ['totalassets'],
  currentAssets: ['currentassets'],
  inventory: ['inventory', 'inventories'],
  totalLiabilities: ['totalliabilities'],
  currentLiabilities: ['currentliabilities'],
  totalDebt: ['totaldebt', 'borrowings', 'debt'],
  equity: ['equity', 'shareholdersequity', 'totalequity', 'shareholderequity'],
  cash: ['cash', 'cashandequivalents', 'cashandcashequivalents'],
  operatingCashFlow: ['operatingcashflow', 'cfo', 'cashfromoperations'],
  investingCashFlow: ['investingcashflow', 'cfi'],
  financingCashFlow: ['financingcashflow', 'cff'],
  capex: ['capex', 'capitalexpenditure'],
  freeCashFlow: ['freecashflow', 'fcf'],
};

const DATE_ALIASES = ['periodend', 'date', 'fiscalyearend', 'period'];
const KIND_ALIASES = ['kind', 'type', 'periodtype'];

export type AmountUnit = 'units' | 'thousands' | 'millions';
export const UNIT_FACTOR: Record<AmountUnit, number> = { units: 1, thousands: 1e3, millions: 1e6 };

export interface FundamentalsParse {
  periods: StatementPeriod[];
  errors: string[];
  errorCount: number;
  fatal: string | null;
  recognisedColumns: string[];
  ignoredColumns: string[];
}

const norm = (h: string) => h.toLowerCase().replace(/^"|"$/g, '').replace(/[^a-z0-9]/g, '');

/**
 * Header row required. Columns: period_end (YYYY-MM-DD), optional kind (annual or quarterly,
 * default annual), then any statement fields. Amounts are multiplied by the chosen unit; EPS and
 * dividends per share are never scaled.
 */
export function parseFundamentalsCsv(text: string, unit: AmountUnit = 'units', order: DateOrder = 'ISO'): FundamentalsParse {
  const base: FundamentalsParse = { periods: [], errors: [], errorCount: 0, fatal: null, recognisedColumns: [], ignoredColumns: [] };
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return { ...base, fatal: 'The file needs a header row and at least one data row.' };
  const delim = detectDelimiter(lines[0]);
  const rawHeaders = splitLine(lines[0], delim);
  const headers = rawHeaders.map(norm);
  const iDate = headers.findIndex((h) => DATE_ALIASES.includes(h));
  if (iDate === -1) return { ...base, fatal: `Missing the period end date column (use "period_end"). Found: ${rawHeaders.join(', ')}.` };
  const iKind = headers.findIndex((h) => KIND_ALIASES.includes(h));
  const fieldCols: { idx: number; field: StatementField }[] = [];
  const ignored: string[] = [];
  headers.forEach((h, idx) => {
    if (idx === iDate || idx === iKind) return;
    const field = STATEMENT_FIELDS.find((f) => norm(f) === h || ALIASES[f].includes(h));
    if (field) fieldCols.push({ idx, field }); else ignored.push(rawHeaders[idx]);
  });
  if (!fieldCols.length) return { ...base, fatal: 'No recognised statement columns (for example revenue, net_income, total_assets, operating_cash_flow).' };

  const factor = UNIT_FACTOR[unit];
  const byKey = new Map<string, StatementPeriod>();
  let errorCount = 0;
  const errors: string[] = [];
  const fail = (line: number, msg: string) => { errorCount++; if (errors.length < 15) errors.push(`Line ${line}: ${msg}`); };

  for (let r = 1; r < lines.length; r++) {
    const cells = splitLine(lines[r], delim);
    const periodEnd = parseDate(cells[iDate] ?? '', order);
    if (!periodEnd) { fail(r + 1, `unreadable period end "${cells[iDate] ?? ''}"`); continue; }
    let kind: StatementKind = 'annual';
    if (iKind !== -1) {
      const k = (cells[iKind] ?? '').trim().toLowerCase();
      if (k === 'quarterly' || k === 'quarter' || k === 'q') kind = 'quarterly';
      else if (k === 'annual' || k === 'year' || k === 'fy' || k === '') kind = 'annual';
      else { fail(r + 1, `kind must be "annual" or "quarterly", got "${k}"`); continue; }
    }
    const p: StatementPeriod = { periodEnd, kind };
    let any = false;
    let bad = false;
    for (const { idx, field } of fieldCols) {
      const raw = cells[idx];
      if (raw == null || raw.trim() === '') continue;
      const n = parseNumber(raw);
      if (!Number.isFinite(n)) { fail(r + 1, `"${raw}" in ${field} is not a number`); bad = true; break; }
      p[field] = PER_SHARE_FIELDS.includes(field) ? n : n * factor;
      any = true;
    }
    if (bad) continue;
    if (!any) { fail(r + 1, 'row has no values'); continue; }
    byKey.set(`${kind}:${periodEnd}`, p);
  }
  const periods = [...byKey.values()].sort((a, b) => (a.periodEnd < b.periodEnd ? -1 : 1));
  return {
    periods, errors, errorCount,
    fatal: periods.length ? null : 'No valid rows were found.',
    recognisedColumns: fieldCols.map((c) => c.field), ignoredColumns: ignored,
  };
}

export const CSV_TEMPLATE = [
  'period_end,kind,revenue,cost_of_revenue,operating_income,net_income,eps,dividends_per_share,total_assets,current_assets,inventory,total_liabilities,current_liabilities,total_debt,equity,cash,operating_cash_flow,capex',
  '# Replace the example row with figures from the company\'s published annual report. Delete this line before importing.',
  '2024-12-31,annual,,,,,,,,,,,,,,,,',
].join('\n');
