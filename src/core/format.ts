const DASH = '–';

export function fmtPrice(n: number | null | undefined, currency = 'MYR'): string {
  if (n == null || !Number.isFinite(n)) return DASH;
  const prefix = currency === 'MYR' ? 'RM' : currency;
  const digits = Math.abs(n) >= 1000 ? 2 : Math.abs(n) >= 1 ? 3 : 4;
  // Bursa quotes to 3 decimals for most prices; trim trailing zeros to two places minimum.
  const s = n.toFixed(digits).replace(/(\.\d\d\d?)0$/, '$1').replace(/(\.\d\d)0$/, '$1');
  return `${prefix} ${s}`;
}

export function fmtNumber(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return DASH;
  return n.toLocaleString('en-MY', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(n: number | null | undefined, digits = 2, withSign = true): string {
  if (n == null || !Number.isFinite(n)) return DASH;
  const sign = withSign && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return DASH;
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

/** Direction marker so movement is never communicated by colour alone. */
export function arrow(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return '■';
  return n > 0 ? '▲' : '▼';
}

export function signClass(n: number | null | undefined): 'pos' | 'neg' | 'flat' {
  if (n == null || !Number.isFinite(n) || n === 0) return 'flat';
  return n > 0 ? 'pos' : 'neg';
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return DASH;
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}
