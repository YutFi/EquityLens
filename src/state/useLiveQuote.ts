import { useEffect, useRef, useState } from 'react';
import type { Security } from '../core/types';
import { MIN_POLL_SECONDS, fetchBridgeQuote, type Failure, type LiveQuote } from '../data/providers/moomoo';

export interface LiveState { quote: LiveQuote | null; failure: Failure | null; updatedAt: number | null; polling: boolean }

/**
 * Polls the user's local bridge for the latest quote while `active` and the page is visible.
 * Nothing is requested unless the user has enabled the bridge AND switched Live on for this page.
 * After a failure it slows to 30 s so a stopped bridge is not hammered, and it stops on unmount.
 */
export function useLiveQuote(
  sec: Pick<Security, 'market' | 'code' | 'kind'> | undefined, bridgeUrl: string, active: boolean, seconds = 15, fetchImpl?: typeof fetch,
): LiveState {
  const [state, setState] = useState<LiveState>({ quote: null, failure: null, updatedAt: null, polling: false });
  const fetchRef = useRef(fetchImpl);
  fetchRef.current = fetchImpl;
  const market = sec?.market; const code = sec?.code; const kind = sec?.kind;

  useEffect(() => {
    if (!active || !market || !code || !kind) { setState((s) => (s.polling ? { ...s, polling: false } : s)); return; }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const every = Math.max(MIN_POLL_SECONDS, seconds) * 1000;
    setState({ quote: null, failure: null, updatedAt: null, polling: true });
    const tick = async () => {
      if (stopped) return;
      let delay = every;
      if (typeof document !== 'undefined' && document.hidden) { timer = setTimeout(() => void tick(), every); return; }
      const r = await fetchBridgeQuote({ market, code, kind }, bridgeUrl, { fetchImpl: fetchRef.current });
      if (stopped) return;
      if (r.ok) setState({ quote: r.quote, failure: null, updatedAt: Date.now(), polling: true });
      else { setState((s) => ({ ...s, failure: r, polling: true })); delay = Math.max(every, 30000); }
      timer = setTimeout(() => void tick(), delay);
    };
    void tick();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [active, bridgeUrl, market, code, kind, seconds]);

  return state;
}
