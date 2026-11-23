import type { Bar, Security } from '../../core/types';
import {
  applyLiveQuote, buildMoomooSeries, DEFAULT_BRIDGE_URL, fetchBridgeHealth, fetchBridgeHistory, fetchBridgeQuote,
  loadBridgeConfig, moomooCode, MOOMOO_BRIDGE_STORAGE, normaliseBridgeUrl, parseBridgeCandles, parseBridgeQuote, saveBridgeConfig, type LiveQuote,
} from './moomoo';

const maybank: Security = { id: 'XKLS:1155', market: 'XKLS', code: '1155', name: 'Example Bhd', kind: 'equity', sector: 'x', currency: 'MYR', origin: 'seed' };
const bar = (t: string, o: number, h: number, l: number, c: number, v: number | null = 1000): Bar => ({ t, o, h, l, c, v });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
const fetchReturning = (body: unknown, status = 200) => vi.fn(async () => jsonResponse(body, status)) as unknown as typeof fetch;

describe('normaliseBridgeUrl', () => {
  it.each([
    ['http://127.0.0.1:8765', 'http://127.0.0.1:8765'],
    ['localhost:8765', 'http://localhost:8765'],
    ['http://localhost:8765/', 'http://localhost:8765'],
    ['[::1]:8765', 'http://[::1]:8765'],
  ])('accepts %s', (input, out) => expect(normaliseBridgeUrl(input)).toBe(out));

  it.each([
    '', 'https://127.0.0.1:8765', 'http://192.168.1.5:8765', 'http://example.com', 'http://127.0.0.1.evil.com:8765',
    'http://user:pw@127.0.0.1:8765', 'http://127.0.0.1:8765/secret', 'http://127.0.0.1:8765?x=1', 'javascript:alert(1)', 'ftp://127.0.0.1',
  ])('rejects %s', (input) => expect(normaliseBridgeUrl(input)).toBeNull());
});

describe('bridge config storage', () => {
  beforeEach(() => localStorage.clear());
  it('defaults to disabled', () => expect(loadBridgeConfig()).toEqual({ enabled: false, url: DEFAULT_BRIDGE_URL }));
  it('round-trips and refuses to stay enabled with a non-loopback address', () => {
    saveBridgeConfig({ enabled: true, url: 'http://127.0.0.1:9000' });
    expect(loadBridgeConfig()).toEqual({ enabled: true, url: 'http://127.0.0.1:9000' });
    localStorage.setItem(MOOMOO_BRIDGE_STORAGE, JSON.stringify({ enabled: true, url: 'http://evil.example' }));
    expect(loadBridgeConfig()).toEqual({ enabled: false, url: DEFAULT_BRIDGE_URL });
    localStorage.setItem(MOOMOO_BRIDGE_STORAGE, '{not json');
    expect(loadBridgeConfig().enabled).toBe(false);
  });
});

describe('moomooCode', () => {
  it('only supports Bursa equities', () => {
    expect(moomooCode(maybank)).toBe('1155');
    expect(moomooCode({ ...maybank, market: 'XNAS' })).toBeNull();
    expect(moomooCode({ ...maybank, kind: 'index' })).toBeNull();
    expect(moomooCode({ ...maybank, code: '../x' })).toBeNull();
  });
});

describe('parseBridgeCandles', () => {
  it('re-validates rows, rejects instead of repairing, de-duplicates and sorts', () => {
    const r = parseBridgeCandles({
      source: 'moomoo', rejected: 1,
      bars: [
        { t: '2026-11-19', o: 9.6, h: 9.8, l: 9.5, c: 9.7, v: 1100 },
        { t: '2026-11-18', o: 9.5, h: 9.7, l: 9.4, c: 9.6, v: null },
        { t: '2026-11-19', o: 9.6, h: 9.9, l: 9.5, c: 9.8, v: 1200 },
        { t: '2026-11-20', o: 9.7, h: 9.0, l: 9.9, c: 9.8, v: 1 },          // high < low
        { t: '2026-11-21', o: 9.7, h: 9.8, l: 9.6, c: 9.95, v: 1 },         // close above high
        { t: '2026-11-22', o: 0, h: 9.8, l: 9.6, c: 9.7, v: 1 },            // zero price
        { t: 'x', o: 1, h: 1, l: 1, c: 1, v: 1 },
        { t: '2026-11-23', o: 9.7, h: 9.8, l: 9.6, c: '9.7', v: 1 },        // string number
      ],
    });
    expect(r.bars.map((b) => b.t)).toEqual(['2026-11-18', '2026-11-19']);
    expect(r.bars[1].c).toBe(9.8);
    expect(r.bars[0].v).toBeNull();
    expect(r.rejected).toBe(1 + 5);
    expect(r.source).toBe('moomoo');
    expect(r.error).toBeUndefined();
  });
  it('flags unexpected shapes and empty results', () => {
    expect(parseBridgeCandles({ source: 'moomoo', bars: 'nope' }).error).toBeDefined();
    expect(parseBridgeCandles({ source: 'other', bars: [] }).error).toBeDefined();
    expect(parseBridgeCandles({ source: 'moomoo', bars: [] }).error).toMatch(/no valid bars/i);
    expect(parseBridgeCandles(null).error).toBeDefined();
  });
  it('keeps the mock label', () => expect(parseBridgeCandles({ source: 'mock', bars: [{ t: '2026-11-18', o: 1, h: 1, l: 1, c: 1, v: 1 }] }).source).toBe('mock'));
});

describe('fetchBridgeHistory', () => {
  const body = { source: 'moomoo', bars: [{ t: '2026-11-18', o: 9.5, h: 9.7, l: 9.4, c: 9.6, v: 10 }] };

  it('requests candles for the stock code from the loopback bridge only', async () => {
    const f = fetchReturning(body);
    const r = await fetchBridgeHistory(maybank, 'localhost:8765', { from: '2025-01-01', fetchImpl: f });
    expect(r.ok).toBe(true);
    const url = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toBe('http://localhost:8765/candles?code=1155&from=2025-01-01');
  });

  it('never makes a request for a non-loopback address or an unsupported security', async () => {
    const f = fetchReturning(body);
    const bad = await fetchBridgeHistory(maybank, 'http://example.com', { fetchImpl: f });
    expect(bad).toMatchObject({ ok: false, kind: 'bad-url' });
    const unsupported = await fetchBridgeHistory({ ...maybank, market: 'XNAS' }, DEFAULT_BRIDGE_URL, { fetchImpl: f });
    expect(unsupported).toMatchObject({ ok: false, kind: 'unsupported' });
    expect(f).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'origin-not-allowed', 'origin-not-allowed'],
    [429, 'quota', 'quota'],
    [403, 'no-quote-right', 'no-quote-right'],
    [404, 'not-found', 'not-found'],
    [503, 'opend-unreachable', 'opend-unreachable'],
    [502, 'upstream', 'upstream'],
    [500, 'something-new', 'upstream'],
  ])('maps bridge error %i/%s to %s and keeps the bridge message', async (status, code, kind) => {
    const r = await fetchBridgeHistory(maybank, DEFAULT_BRIDGE_URL, { fetchImpl: fetchReturning({ error: { code, message: 'plain words' } }, status) });
    expect(r).toMatchObject({ ok: false, kind, message: 'plain words' });
  });

  it('explains an unreachable bridge and a non-JSON reply without throwing', async () => {
    const down = vi.fn(async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    const r = await fetchBridgeHistory(maybank, DEFAULT_BRIDGE_URL, { fetchImpl: down });
    expect(r).toMatchObject({ ok: false, kind: 'offline' });
    expect((r as { message: string }).message).toMatch(/CSV/);
    const html = vi.fn(async () => new Response('<html></html>', { status: 200 })) as unknown as typeof fetch;
    expect(await fetchBridgeHistory(maybank, DEFAULT_BRIDGE_URL, { fetchImpl: html })).toMatchObject({ ok: false, kind: 'format' });
  });

  it('reports a timeout when the request is aborted', async () => {
    const aborting = vi.fn(async () => { throw new DOMException('aborted', 'AbortError'); }) as unknown as typeof fetch;
    expect(await fetchBridgeHistory(maybank, DEFAULT_BRIDGE_URL, { fetchImpl: aborting })).toMatchObject({ ok: false, kind: 'timeout' });
  });

  it('turns an empty valid response into a clear failure', async () => {
    expect(await fetchBridgeHistory(maybank, DEFAULT_BRIDGE_URL, { fetchImpl: fetchReturning({ source: 'moomoo', bars: [] }) })).toMatchObject({ ok: false, kind: 'format' });
  });
});

describe('fetchBridgeHealth', () => {
  it('reads bridge and OpenD state', async () => {
    const r = await fetchBridgeHealth(DEFAULT_BRIDGE_URL, fetchReturning({ ok: true, source: 'moomoo', bridgeVersion: '0.1.0', readOnly: true, opend: { connected: true, quoteLoggedIn: false } }));
    expect(r).toMatchObject({ ok: true, health: { source: 'moomoo', readOnly: true, opendConnected: true, quoteLoggedIn: false } });
  });
  it('does not accept some other server on that port', async () => {
    expect(await fetchBridgeHealth(DEFAULT_BRIDGE_URL, fetchReturning({ hello: 'world' }))).toMatchObject({ ok: false, kind: 'format' });
  });
  it('rejects a non-loopback address without a request', async () => {
    const f = fetchReturning({});
    expect(await fetchBridgeHealth('http://example.com', f)).toMatchObject({ ok: false, kind: 'bad-url' });
    expect(f).not.toHaveBeenCalled();
  });
});

describe('quotes', () => {
  const good = { source: 'moomoo', price: 9.87, prevClose: 9.8, open: 9.81, high: 9.9, low: 9.79, volume: 1234500, time: '2026-11-23 10:30:00' };
  it('parses a snapshot and extracts the date', () => {
    expect(parseBridgeQuote(good)).toMatchObject({ ok: true, quote: { price: 9.87, date: '2026-11-23', prevClose: 9.8, source: 'moomoo' } });
  });
  it('refuses a missing, zero or negative price rather than showing 0', () => {
    for (const price of [undefined, 0, -1, NaN, '9.8']) expect(parseBridgeQuote({ ...good, price })).toMatchObject({ ok: false, kind: 'format' });
  });
  it('fetches /quote with the stock code', async () => {
    const f = fetchReturning(good);
    expect(await fetchBridgeQuote(maybank, DEFAULT_BRIDGE_URL, { fetchImpl: f })).toMatchObject({ ok: true });
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('http://127.0.0.1:8765/quote?code=1155');
  });
});

describe('applyLiveQuote', () => {
  const bars = [bar('2026-11-19', 9.5, 9.7, 9.4, 9.6), bar('2026-11-20', 9.6, 9.8, 9.5, 9.7, 500)];
  const q = (over: Partial<LiveQuote>): LiveQuote => ({ price: 9.9, prevClose: 9.7, open: 9.72, high: 9.95, low: 9.7, volume: 800, date: '2026-11-23', time: '2026-11-23 10:00:00', source: 'moomoo', ...over });

  it('appends a provisional bar for a newer date without touching history', () => {
    const out = applyLiveQuote(bars, q({}));
    expect(out).toHaveLength(3);
    expect(out[2]).toEqual({ t: '2026-11-23', o: 9.72, h: 9.95, l: 9.7, c: 9.9, v: 800 });
    expect(bars).toHaveLength(2);
  });
  it('keeps the bar internally consistent when the quote lacks high/low', () => {
    const o = applyLiveQuote(bars, q({ high: null, low: null, open: null, prevClose: 9.7, price: 9.5 }))[2];
    expect(o.h).toBeGreaterThanOrEqual(Math.max(o.o, o.c));
    expect(o.l).toBeLessThanOrEqual(Math.min(o.o, o.c));
  });
  it('updates the latest bar when the quote is for the same date', () => {
    const out = applyLiveQuote(bars, q({ date: '2026-11-20', price: 9.85, high: 9.9, low: 9.45 }));
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ o: 9.6, h: 9.9, l: 9.45, c: 9.85 });
  });
  it('ignores a quote older than stored data, or without a date, or no quote', () => {
    expect(applyLiveQuote(bars, q({ date: '2026-11-01' }))).toBe(bars);
    expect(applyLiveQuote(bars, q({ date: null }))).toBe(bars);
    expect(applyLiveQuote(bars, null)).toBe(bars);
    expect(applyLiveQuote([], q({}))).toEqual([]);
  });
});

describe('buildMoomooSeries', () => {
  const now = new Date('2026-11-23T04:00:00Z');
  const bars = [bar('2026-11-19', 9.5, 9.7, 9.4, 9.6), bar('2026-11-20', 9.6, 9.8, 9.5, 9.7), bar('2026-11-23', 9.7, 9.8, 9.6, 9.75)];
  it('never labels Moomoo data verified and records the licence note', () => {
    const s = buildMoomooSeries(maybank, bars, 0, 'moomoo', now);
    expect(s.quality.status).not.toBe('verified');
    expect(s.quality.source).toMatch(/Moomoo/);
    expect(s.quality.notes.join(' ')).toMatch(/not independently verified/i);
    expect(s.quality.notes.join(' ')).toMatch(/do not redistribute/i);
    expect(s.adjustedAvailable).toBe(false);
  });
  it('labels mock bridge data as synthetic demo data', () => {
    const s = buildMoomooSeries(maybank, bars, 0, 'mock', now);
    expect(s.quality.status).toBe('demo');
    expect(s.quality.source).toMatch(/MOCK/);
  });
});
