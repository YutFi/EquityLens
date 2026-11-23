import type { Bar } from '../core/types';

/**
 * Parser for end-of-day OHLCV CSV exports (Yahoo Finance, Stooq, broker exports, spreadsheets).
 *
 * Design rules:
 * - Never guess ambiguous dates. Dates must be ISO (YYYY-MM-DD / YYYY/MM/DD) unless the user picks DMY or MDY.
 * - Never repair or invent values. Bad rows are rejected and counted.
 * - Duplicates (same date) keep the last occurrence and are reported.
 */

export type DateOrder = 'ISO' | 'DMY' | 'MDY';

export interface ParseResult {
  bars: Bar[];
  /** First few row-level problems (capped) for display. */
  errors: string[];
  errorCount: number;
  /** Rows kept but suspicious, e.g. high below close. */
  warningCount: number;
  rowsRead: number;
  duplicatesRemoved: number;
  hasAdjClose: boolean;
  hasVolume: boolean;
  delimiter: string;
  fatal: string | null;
}

const MAX_ERRORS = 15;

const ALIASES = {
  date: ['date', 'time', 'timestamp', 'datetime'],
  open: ['open'],
  high: ['high'],
  low: ['low'],
  close: ['close', 'closing price', 'last'],
  adj: ['adj close', 'adj_close', 'adjclose', 'adjusted close', 'adjusted_close'],
  volume: ['volume', 'vol', 'vol.'],
} as const;

export function detectDelimiter(headerLine: string): string {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const c of candidates) {
    const n = headerLine.split(c).length;
    if (n > bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best;
}

export function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseDate(raw: string, order: DateOrder): string | null {
  const s = raw.trim().replace(/^"|"$/g, '').split(/[ T]/)[0];
  let y: number;
  let m: number;
  let d: number;
  let match: RegExpMatchArray | null;
  if (order === 'ISO') {
    match = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!match) return null;
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (!match) return null;
    y = Number(match[3]);
    if (order === 'DMY') [d, m] = [Number(match[1]), Number(match[2])];
    else [m, d] = [Number(match[1]), Number(match[2])];
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseNumber(raw: string | undefined): number {
  if (raw == null) return NaN;
  const s = raw.replace(/["\s,]/g, '');
  if (s === '' || /^(null|nan|n\/a|-)$/i.test(s)) return NaN;
  return Number(s);
}

function findColumn(headers: string[], names: readonly string[]): number {
  return headers.findIndex((h) => names.includes(h));
}

export function parseOhlcCsv(text: string, order: DateOrder = 'ISO'): ParseResult {
  const empty: ParseResult = {
    bars: [], errors: [], errorCount: 0, warningCount: 0, rowsRead: 0, duplicatesRemoved: 0,
    hasAdjClose: false, hasVolume: false, delimiter: ',', fatal: null,
  };
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return { ...empty, fatal: 'The file needs a header row and at least one data row.' };

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/^"|"$/g, ''));
  const iDate = findColumn(headers, ALIASES.date);
  const iOpen = findColumn(headers, ALIASES.open);
  const iHigh = findColumn(headers, ALIASES.high);
  const iLow = findColumn(headers, ALIASES.low);
  const iClose = findColumn(headers, ALIASES.close);
  const iAdj = findColumn(headers, ALIASES.adj);
  const iVol = findColumn(headers, ALIASES.volume);

  const missing = [
    ['Date', iDate], ['Open', iOpen], ['High', iHigh], ['Low', iLow], ['Close', iClose],
  ].filter(([, i]) => i === -1).map(([n]) => n as string);
  if (missing.length) {
    return {
      ...empty, delimiter,
      fatal: `Missing required column(s): ${missing.join(', ')}. Found: ${headers.join(', ')}.`,
    };
  }

  const errors: string[] = [];
  let errorCount = 0;
  let warningCount = 0;
  let adjRows = 0;
  let volRows = 0;
  const byDate = new Map<string, Bar>();
  let duplicatesRemoved = 0;
  const fail = (line: number, msg: string) => {
    errorCount++;
    if (errors.length < MAX_ERRORS) errors.push(`Line ${line}: ${msg}`);
  };

  for (let r = 1; r < lines.length; r++) {
    const cells = splitLine(lines[r], delimiter);
    const lineNo = r + 1;
    const t = parseDate(cells[iDate] ?? '', order);
    if (!t) {
      fail(lineNo, `unreadable date "${cells[iDate] ?? ''}" (expected ${order === 'ISO' ? 'YYYY-MM-DD' : order === 'DMY' ? 'DD/MM/YYYY' : 'MM/DD/YYYY'})`);
      continue;
    }
    const o = parseNumber(cells[iOpen]);
    const h = parseNumber(cells[iHigh]);
    const l = parseNumber(cells[iLow]);
    const c = parseNumber(cells[iClose]);
    if (![o, h, l, c].every((n) => Number.isFinite(n) && n > 0)) {
      fail(lineNo, 'open/high/low/close must all be positive numbers');
      continue;
    }
    if (h < l) {
      fail(lineNo, 'high is below low');
      continue;
    }
    if (h < Math.max(o, c) - 1e-9 || l > Math.min(o, c) + 1e-9) warningCount++;
    const vRaw = iVol === -1 ? NaN : parseNumber(cells[iVol]);
    const v = Number.isFinite(vRaw) && vRaw >= 0 ? vRaw : null;
    if (v !== null) volRows++;
    const aRaw = iAdj === -1 ? NaN : parseNumber(cells[iAdj]);
    const adj = Number.isFinite(aRaw) && aRaw > 0 ? aRaw : null;
    if (adj !== null) adjRows++;
    if (byDate.has(t)) duplicatesRemoved++;
    byDate.set(t, { t, o, h, l, c, v, adj });
  }

  const bars = [...byDate.values()].sort((a, b) => (a.t < b.t ? -1 : 1));
  const rowsRead = lines.length - 1;
  let fatal: string | null = null;
  if (bars.length === 0) {
    fatal = 'No valid rows were found.';
    if (order === 'ISO' && errorCount > 0) fatal += ' If your dates look like 21/11/2025, choose the DD/MM/YYYY date order.';
  }
  return {
    bars, errors, errorCount, warningCount, rowsRead, duplicatesRemoved,
    hasAdjClose: bars.length > 0 && adjRows === bars.length,
    hasVolume: bars.length > 0 && volRows > 0,
    delimiter, fatal,
  };
}
