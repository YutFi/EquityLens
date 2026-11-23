import type { Bar, PriceSeries, Security } from '../../core/types';
import { assessSeries } from '../quality';

/**
 * EXPERIMENTAL optional provider: EOD Historical Data (eodhd.com), using a key the USER supplies.
 *
 * Why optional and user-keyed: it is the only route found that covers Bursa Malaysia (".KLSE")
 * without a paid backend, and its free plan (as documented on its website) allows 20 calls per
 * day and one year of history. The key never leaves this browser except in requests to eodhd.com.
 *
 * NOT verified in this build: the development sandbox cannot reach eodhd.com, so response format
 * handling follows the vendor's documentation and unit tests with sample payloads. Whether
 * browsers are allowed to call the API (CORS) and whether the free plan returns Bursa data were
 * not confirmed. A failure is reported plainly and never crashes the app.
 */

export const EODHD_KEY_STORAGE = 'equitylens.eodhd.key';

export function loadEodhdKey(): string {
  try { return localStorage.getItem(EODHD_KEY_STORAGE) ?? ''; } catch { return ''; }
}
export function saveEodhdKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(EODHD_KEY_STORAGE, key.trim()); else localStorage.removeItem(EODHD_KEY_STORAGE);
  } catch { /* storage unavailable: the key then lasts for this session only */ }
}

export function eodhdSymbol(sec: Pick<Security, 'market' | 'code'>): string | null {
  return sec.market === 'XKLS' ? `${sec.code}.KLSE` : null;
}

export interface EodhdParse { bars: Bar[]; rejected: number; error?: string }

/** Parses the documented end-of-day JSON array. Rows that are not clean numbers are rejected, never repaired. */
export function parseEodhd(json: unknown): EodhdParse {
  if (!Array.isArray(json)) return { bars: [], rejected: 0, error: 'The response was not a list of daily bars.' };
  const byDate = new Map<string, Bar>();
  let rejected = 0;
  for (const row of json as Record<string, unknown>[]) {
    const date = typeof row?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : null;
    const [o, h, l, c] = [row?.open, row?.high, row?.low, row?.close].map((x) => (typeof x === 'number' ? x : NaN));
    if (!date || ![o, h, l, c].every((n) => Number.isFinite(n) && n > 0) || h < l) { rejected++; continue; }
    const v = typeof row.volume === 'number' && Number.isFinite(row.volume) && row.volume >= 0 ? row.volume : null;
    const adj = typeof row.adjusted_close === 'number' && Number.isFinite(row.adjusted_close) && row.adjusted_close > 0 ? row.adjusted_close : null;
    byDate.set(date, { t: date, o, h, l, c, v, adj });
  }
  const bars = [...byDate.values()].sort((a, b) => (a.t < b.t ? -1 : 1));
  return { bars, rejected, error: bars.length ? undefined : 'No valid bars in the response.' };
}

export type EodhdFailure = 'no-key' | 'unsupported' | 'network' | 'auth' | 'limit' | 'not-found' | 'format';
export type EodhdResult = { ok: true; bars: Bar[]; rejected: number } | { ok: false; kind: EodhdFailure; message: string };

export async function fetchEodhdHistory(
  sec: Pick<Security, 'market' | 'code'>, apiKey: string, opts: { from?: string; fetchImpl?: typeof fetch } = {},
): Promise<EodhdResult> {
  if (!apiKey.trim()) return { ok: false, kind: 'no-key', message: 'Add your EODHD API key in Settings first.' };
  const sym = eodhdSymbol(sec);
  if (!sym) return { ok: false, kind: 'unsupported', message: 'EODHD fetching is only set up for Bursa Malaysia in this release.' };
  const q = new URLSearchParams({ api_token: apiKey.trim(), fmt: 'json', period: 'd', order: 'a' });
  if (opts.from) q.set('from', opts.from);
  const url = `https://eodhd.com/api/eod/${encodeURIComponent(sym)}?${q.toString()}`;
  let res: Response;
  try {
    res = await (opts.fetchImpl ?? fetch)(url);
  } catch {
    return { ok: false, kind: 'network', message: 'The request could not be completed. You may be offline, or the browser blocked the call (the provider may not allow requests from web pages). Import a CSV instead.' };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, kind: 'auth', message: 'EODHD rejected the key or your plan does not include this data.' };
  if (res.status === 402 || res.status === 429) return { ok: false, kind: 'limit', message: 'EODHD says the daily request limit (about 20 on the free plan) has been used. Try again tomorrow.' };
  if (res.status === 404) return { ok: false, kind: 'not-found', message: `EODHD has no data for ${sym}.` };
  if (!res.ok) return { ok: false, kind: 'network', message: `EODHD returned HTTP ${res.status}.` };
  let json: unknown;
  try { json = await res.json(); } catch { return { ok: false, kind: 'format', message: 'The response was not valid JSON.' }; }
  const parsed = parseEodhd(json);
  if (parsed.error) return { ok: false, kind: 'format', message: parsed.error };
  return { ok: true, bars: parsed.bars, rejected: parsed.rejected };
}

/** Builds a series from fetched bars. Vendor data is "historical" at best: this app never labels it verified. */
export function buildEodhdSeries(sec: Security, bars: Bar[], rejected: number, now = new Date()): PriceSeries {
  const quality = assessSeries({ bars, source: 'EOD Historical Data API (your key; free plan: last 12 months)', currency: sec.currency, now, rejectedRows: rejected });
  quality.notes.push('Fetched with your own API key. Not independently verified by EquityLens; check the vendor\'s licence before sharing or redistributing it.');
  return { securityId: sec.id, bars, quality, adjustedAvailable: bars.length > 0 && bars.every((b) => b.adj != null) };
}
