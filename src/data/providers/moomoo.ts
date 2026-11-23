import type { Bar, PriceSeries, Security } from '../../core/types';
import { assessSeries } from '../quality';

/**
 * EXPERIMENTAL optional provider: Moomoo OpenAPI through a LOCAL, read-only bridge that the user
 * runs on their own computer (see /bridge and docs/MOOMOO_BRIDGE.md).
 *
 * Why a bridge: Moomoo's OpenD gateway must run on the user's own machine, so a static website
 * cannot reach it directly, and API keys must never be embedded in public front-end code. The
 * bridge uses the user's own Moomoo login and data rights and serves JSON on loopback only.
 *
 * Honesty rules kept here:
 * - Only loopback bridge URLs are ever contacted (no arbitrary hosts, no credentials in the URL).
 * - Moomoo data is user-account data: it is never labelled "verified", and EquityLens never
 *   stores or ships it anywhere except this browser.
 * - A bridge running in mock mode returns source "mock"; that is shown as demo data, and is
 *   refused when it would overwrite real data.
 * - NOT verified in this build: the development sandbox cannot reach Moomoo, so behaviour is
 *   covered by unit tests with sample payloads, not by a live account. Browser access to
 *   localhost from the hosted site (permission prompts, Safari mixed-content rules) is untested.
 */

export const MOOMOO_BRIDGE_STORAGE = 'equitylens.moomoo.bridge';
export const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:8765';
export const MIN_POLL_SECONDS = 10;

export interface BridgeConfig { enabled: boolean; url: string }

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

/** Accepts "http://127.0.0.1:8765", "localhost:8765" or "[::1]:8765". Returns null for anything that is not a plain loopback origin. */
export function normaliseBridgeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let u: URL;
  try { u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `http://${raw}`); } catch { return null; }
  if (u.protocol !== 'http:') return null;
  if (!LOOPBACK.has(u.hostname)) return null;
  if (u.username || u.password || u.search || u.hash || (u.pathname !== '/' && u.pathname !== '')) return null;
  return `http://${u.host}`;
}

export function loadBridgeConfig(): BridgeConfig {
  try {
    const raw = localStorage.getItem(MOOMOO_BRIDGE_STORAGE);
    if (!raw) return { enabled: false, url: DEFAULT_BRIDGE_URL };
    const j = JSON.parse(raw) as Partial<BridgeConfig>;
    const url = typeof j.url === 'string' ? normaliseBridgeUrl(j.url) : null;
    return { enabled: j.enabled === true && url != null, url: url ?? DEFAULT_BRIDGE_URL };
  } catch { return { enabled: false, url: DEFAULT_BRIDGE_URL }; }
}
export function saveBridgeConfig(cfg: BridgeConfig): void {
  try { localStorage.setItem(MOOMOO_BRIDGE_STORAGE, JSON.stringify(cfg)); } catch { /* storage unavailable: lasts for this session only */ }
}

/** Bursa equities only in this release; the bridge adds the Moomoo market prefix itself. */
export function moomooCode(sec: Pick<Security, 'market' | 'code' | 'kind'>): string | null {
  return sec.market === 'XKLS' && sec.kind === 'equity' && /^[0-9A-Za-z]{1,12}$/.test(sec.code) ? sec.code : null;
}

export type BridgeSource = 'moomoo' | 'mock';
export type BridgeFailure =
  | 'unsupported' | 'bad-url' | 'offline' | 'timeout' | 'origin-not-allowed' | 'quota' | 'no-quote-right'
  | 'opend-unreachable' | 'not-found' | 'format' | 'mock-guard' | 'upstream';

const KNOWN_CODES: Record<string, BridgeFailure> = {
  'origin-not-allowed': 'origin-not-allowed', quota: 'quota', 'no-quote-right': 'no-quote-right',
  'opend-unreachable': 'opend-unreachable', 'not-found': 'not-found',
};

export type Failure = { ok: false; kind: BridgeFailure; message: string };

const OFFLINE_MESSAGE = 'Could not reach the bridge. Check that it is running (python bridge/moomoo_bridge.py serve), that the address in Settings is right, and that your browser allowed this page to access apps on this device. If the browser blocks it, export CSV files with the bridge instead and import them.';

async function getJson(url: string, fetchImpl: typeof fetch | undefined, timeoutMs: number): Promise<{ ok: true; json: unknown } | Failure> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await (fetchImpl ?? fetch)(url, { signal: ctl.signal, cache: 'no-store' });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof DOMException && e.name === 'AbortError') return { ok: false, kind: 'timeout', message: 'The bridge did not answer in time. OpenD may be busy or not logged in.' };
    return { ok: false, kind: 'offline', message: OFFLINE_MESSAGE };
  }
  clearTimeout(timer);
  let json: unknown = null;
  try { json = await res.json(); } catch { /* handled below */ }
  if (!res.ok) {
    const err = (json as { error?: { code?: unknown; message?: unknown } } | null)?.error;
    const code = typeof err?.code === 'string' ? err.code : '';
    const message = typeof err?.message === 'string' ? err.message : `The bridge returned HTTP ${res.status}.`;
    return { ok: false, kind: KNOWN_CODES[code] ?? 'upstream', message };
  }
  if (json == null || typeof json !== 'object') return { ok: false, kind: 'format', message: 'The bridge sent something that was not JSON.' };
  return { ok: true, json };
}

export interface BridgeHealth { source: BridgeSource; bridgeVersion: string; readOnly: boolean; opendConnected: boolean; quoteLoggedIn: boolean | null; note: string | null }

export async function fetchBridgeHealth(baseUrl: string, fetchImpl?: typeof fetch): Promise<{ ok: true; health: BridgeHealth } | Failure> {
  const base = normaliseBridgeUrl(baseUrl);
  if (!base) return { ok: false, kind: 'bad-url', message: 'The bridge address must be on this computer, e.g. http://127.0.0.1:8765.' };
  const r = await getJson(`${base}/health`, fetchImpl, 6000);
  if (!r.ok) return r;
  const j = r.json as Record<string, unknown>;
  const opend = (j.opend ?? {}) as Record<string, unknown>;
  if (j.ok !== true || (j.source !== 'moomoo' && j.source !== 'mock')) return { ok: false, kind: 'format', message: 'That address answered, but it does not look like the EquityLens bridge.' };
  return {
    ok: true,
    health: {
      source: j.source, bridgeVersion: typeof j.bridgeVersion === 'string' ? j.bridgeVersion : 'unknown', readOnly: j.readOnly === true,
      opendConnected: opend.connected === true, quoteLoggedIn: typeof opend.quoteLoggedIn === 'boolean' ? opend.quoteLoggedIn : null,
      note: typeof opend.note === 'string' ? opend.note : null,
    },
  };
}

export interface CandleParse { bars: Bar[]; rejected: number; source: BridgeSource; error?: string }

/** Strict re-validation of the bridge's candles. The app does not trust the bridge to have cleaned them. */
export function parseBridgeCandles(json: unknown): CandleParse {
  const j = json as { bars?: unknown; source?: unknown; rejected?: unknown } | null;
  const source: BridgeSource = j?.source === 'mock' ? 'mock' : 'moomoo';
  if (!j || !Array.isArray(j.bars) || (j.source !== 'moomoo' && j.source !== 'mock')) return { bars: [], rejected: 0, source, error: 'The bridge response did not contain a list of daily bars.' };
  const byDate = new Map<string, Bar>();
  let rejected = typeof j.rejected === 'number' && j.rejected > 0 ? Math.floor(j.rejected) : 0;
  for (const row of j.bars as Record<string, unknown>[]) {
    const t = typeof row?.t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.t) ? row.t : null;
    const [o, h, l, c] = [row?.o, row?.h, row?.l, row?.c].map((x) => (typeof x === 'number' ? x : NaN));
    if (!t || ![o, h, l, c].every((n) => Number.isFinite(n) && n > 0) || h < l || h < Math.max(o, c) || l > Math.min(o, c)) { rejected++; continue; }
    const v = typeof row.v === 'number' && Number.isFinite(row.v) && row.v >= 0 ? row.v : null;
    byDate.set(t, { t, o, h, l, c, v });
  }
  const bars = [...byDate.values()].sort((a, b) => (a.t < b.t ? -1 : 1));
  return { bars, rejected, source, error: bars.length ? undefined : 'The bridge returned no valid bars for this security.' };
}

export type HistoryResult = { ok: true; bars: Bar[]; rejected: number; source: BridgeSource } | Failure;

export async function fetchBridgeHistory(
  sec: Pick<Security, 'market' | 'code' | 'kind'>, baseUrl: string, opts: { from?: string; to?: string; fetchImpl?: typeof fetch } = {},
): Promise<HistoryResult> {
  const base = normaliseBridgeUrl(baseUrl);
  if (!base) return { ok: false, kind: 'bad-url', message: 'The bridge address must be on this computer, e.g. http://127.0.0.1:8765.' };
  const code = moomooCode(sec);
  if (!code) return { ok: false, kind: 'unsupported', message: 'The Moomoo bridge is only set up for Bursa Malaysia equities in this release.' };
  const q = new URLSearchParams({ code });
  if (opts.from) q.set('from', opts.from);
  if (opts.to) q.set('to', opts.to);
  const r = await getJson(`${base}/candles?${q.toString()}`, opts.fetchImpl, 30000);
  if (!r.ok) return r;
  const parsed = parseBridgeCandles(r.json);
  if (parsed.error) return { ok: false, kind: 'format', message: parsed.error };
  return { ok: true, bars: parsed.bars, rejected: parsed.rejected, source: parsed.source };
}

export interface LiveQuote {
  price: number; prevClose: number | null; open: number | null; high: number | null; low: number | null;
  volume: number | null; /** Date part of the quote time (exchange-local), or null when the bridge gave none. */ date: string | null;
  /** Full timestamp text as sent by the bridge. */ time: string; source: BridgeSource;
}

const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : null);

export function parseBridgeQuote(json: unknown): { ok: true; quote: LiveQuote } | Failure {
  const j = json as Record<string, unknown> | null;
  const price = num(j?.price);
  if (!j || price == null || (j.source !== 'moomoo' && j.source !== 'mock')) return { ok: false, kind: 'format', message: 'The bridge did not send a usable price.' };
  const time = typeof j.time === 'string' ? j.time : '';
  return {
    ok: true,
    quote: {
      price, prevClose: num(j.prevClose), open: num(j.open), high: num(j.high), low: num(j.low),
      volume: typeof j.volume === 'number' && Number.isFinite(j.volume) && j.volume >= 0 ? j.volume : null,
      date: /^\d{4}-\d{2}-\d{2}/.test(time) ? time.slice(0, 10) : null, time, source: j.source,
    },
  };
}

export async function fetchBridgeQuote(
  sec: Pick<Security, 'market' | 'code' | 'kind'>, baseUrl: string, opts: { fetchImpl?: typeof fetch } = {},
): Promise<{ ok: true; quote: LiveQuote } | Failure> {
  const base = normaliseBridgeUrl(baseUrl);
  if (!base) return { ok: false, kind: 'bad-url', message: 'The bridge address must be on this computer, e.g. http://127.0.0.1:8765.' };
  const code = moomooCode(sec);
  if (!code) return { ok: false, kind: 'unsupported', message: 'The Moomoo bridge is only set up for Bursa Malaysia equities in this release.' };
  const r = await getJson(`${base}/quote?code=${encodeURIComponent(code)}`, opts.fetchImpl, 8000);
  if (!r.ok) return r;
  return parseBridgeQuote(r.json);
}

/**
 * Builds the display-only series for the chart with the latest quote folded into today's bar.
 * Never persisted and never used by the analytics: forecasts and ratios read stored daily bars.
 * An older quote than the newest stored bar is ignored rather than overwriting history.
 */
export function applyLiveQuote(bars: Bar[], q: LiveQuote | null): Bar[] {
  if (!q || !q.date || bars.length === 0) return bars;
  const last = bars[bars.length - 1];
  if (q.date < last.t) return bars;
  if (q.date === last.t) {
    const merged: Bar = { ...last, c: q.price, h: Math.max(last.h, q.high ?? q.price, q.price), l: Math.min(last.l, q.low ?? q.price, q.price), v: q.volume ?? last.v };
    return [...bars.slice(0, -1), merged];
  }
  const o = q.open ?? q.prevClose ?? q.price;
  const h = Math.max(q.high ?? 0, o, q.price);
  const l = Math.min(q.low ?? Infinity, o, q.price);
  return [...bars, { t: q.date, o, h, l, c: q.price, v: q.volume }];
}

/** Builds a stored series from bridge bars. Moomoo data is user-account data: never "verified". */
export function buildMoomooSeries(sec: Security, bars: Bar[], rejected: number, source: BridgeSource, now = new Date()): PriceSeries {
  const synthetic = source === 'mock';
  const quality = assessSeries({
    bars, now, rejectedRows: rejected, synthetic, currency: sec.currency,
    source: synthetic ? 'MOCK bridge data (synthetic, not real prices)' : 'Moomoo OpenAPI via your local bridge (unadjusted daily candles)',
  });
  if (!synthetic) quality.notes.push('Fetched with your own Moomoo account through a local bridge. Not independently verified by EquityLens. Moomoo\'s data terms apply: keep it for your own use and do not redistribute it. Prices are unadjusted, so splits, bonus issues and dividends are not reflected.');
  return { securityId: sec.id, bars, quality, adjustedAvailable: false };
}

export function describeFailure(f: Failure): string {
  switch (f.kind) {
    case 'quota': return `${f.message} Wait and try again, or fetch fewer securities.`;
    case 'no-quote-right': return `${f.message} Check the quote rights shown in OpenD, or import a CSV instead.`;
    default: return f.message;
  }
}
