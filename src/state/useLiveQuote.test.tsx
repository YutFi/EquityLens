import { act, renderHook } from '@testing-library/react';
import type { Security } from '../core/types';
import { useLiveQuote } from './useLiveQuote';

const sec: Pick<Security, 'market' | 'code' | 'kind'> = { market: 'XKLS', code: '1155', kind: 'equity' };
const quoteBody = (price: number) => ({ source: 'moomoo', price, prevClose: 9.8, time: '2026-11-23 10:00:00' });
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('useLiveQuote', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('makes no request while inactive', async () => {
    const f = vi.fn(async () => respond(quoteBody(9.9))) as unknown as typeof fetch;
    renderHook(() => useLiveQuote(sec, 'http://127.0.0.1:8765', false, 15, f));
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(f).not.toHaveBeenCalled();
  });

  it('polls on the interval while active and stops on unmount', async () => {
    let price = 9.9;
    const f = vi.fn(async () => respond(quoteBody(price))) as unknown as typeof fetch;
    const { result, unmount } = renderHook(() => useLiveQuote(sec, 'http://127.0.0.1:8765', true, 15, f));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.quote?.price).toBe(9.9);
    price = 10.1;
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(result.current.quote?.price).toBe(10.1);
    const calls = (f as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });

  it('never polls faster than the minimum and slows down after a failure', async () => {
    const f = vi.fn(async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    const { result } = renderHook(() => useLiveQuote(sec, 'http://127.0.0.1:8765', true, 1, f));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.failure?.kind).toBe('offline');
    expect(f).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(f).toHaveBeenCalledTimes(1);            // backed off to 30 s
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('keeps the last good quote visible when a later poll fails', async () => {
    let ok = true;
    const f = vi.fn(async () => { if (ok) return respond(quoteBody(9.9)); throw new TypeError('x'); }) as unknown as typeof fetch;
    const { result } = renderHook(() => useLiveQuote(sec, 'http://127.0.0.1:8765', true, 15, f));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    ok = false;
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(result.current.quote?.price).toBe(9.9);
    expect(result.current.failure).not.toBeNull();
  });
});
