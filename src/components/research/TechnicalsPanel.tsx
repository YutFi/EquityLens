import { useMemo, useState } from 'react';
import type { Bar } from '../../core/types';
import { bollinger, macd, readIndicators, rsi, sma, snapshot, type Series } from '../../analytics/indicators';
import { fmtPrice } from '../../core/format';
import { LineChart, type LinePoint } from '../LineChart';

const pts = (bars: Bar[], s: Series): LinePoint[] => bars.flatMap((b, i) => (s[i] == null ? [] : [{ t: b.t, v: s[i] as number }]));

/** Moving averages, Bollinger bands, RSI, MACD and support/resistance, all computed locally from loaded closes. */
export function TechnicalsPanel({ bars, currency }: { bars: Bar[]; currency: string }) {
  const [show, setShow] = useState({ sma20: true, sma50: true, sma200: false, bb: false });
  const view = useMemo(() => {
    const closes = bars.map((b) => b.c);
    const n = Math.min(bars.length, 260);
    const cut = bars.length - n;
    const slice = (s: Series) => s.slice(cut);
    const b = bars.slice(cut);
    const bb = bollinger(closes);
    const m = macd(closes);
    return {
      b, closes: closes.slice(cut),
      sma20: slice(sma(closes, 20)), sma50: slice(sma(closes, 50)), sma200: slice(sma(closes, 200)),
      bbU: slice(bb.upper), bbL: slice(bb.lower),
      rsi: slice(rsi(closes)), macd: slice(m.macd), signal: slice(m.signal),
      snap: snapshot(bars),
    };
  }, [bars]);

  if (bars.length < 30) return <div className="panel empty"><h2>Not enough history</h2><p>Technical indicators need at least about 30 daily bars; {bars.length} loaded.</p></div>;
  const last = bars[bars.length - 1].c;
  const fmt = (v: number) => v.toFixed(3);
  const readings = readIndicators(view.snap, last);
  const priceSeries = [
    { name: 'Close', points: view.b.map((x) => ({ t: x.t, v: x.c })), color: 'var(--text)' },
    ...(show.sma20 ? [{ name: 'SMA 20', points: pts(view.b, view.sma20), color: '#5eead4' }] : []),
    ...(show.sma50 ? [{ name: 'SMA 50', points: pts(view.b, view.sma50), color: '#8b9cff' }] : []),
    ...(show.sma200 ? [{ name: 'SMA 200', points: pts(view.b, view.sma200), color: '#fbbf24' }] : []),
  ].filter((s) => s.points.length > 1);
  const bands = show.bb ? [{ name: 'Bollinger (20, 2)', upper: pts(view.b, view.bbU), lower: pts(view.b, view.bbL), color: '#8b9cff' }].filter((x) => x.upper.length > 1) : [];
  const rsiPts = pts(view.b, view.rsi);
  const first = view.b[0]?.t; const end = view.b[view.b.length - 1]?.t;

  return (
    <div className="stack">
      <section className="panel" aria-label="Price with indicators">
        <header>
          <h2>Price with overlays</h2>
          <div className="row">
            {(['sma20', 'sma50', 'sma200', 'bb'] as const).map((k) => (
              <label key={k} className="row"><input type="checkbox" checked={show[k]} onChange={(e) => setShow({ ...show, [k]: e.target.checked })} /><span className="dim">{k === 'bb' ? 'Bollinger' : k.toUpperCase().replace('SMA', 'SMA ')}</span></label>
            ))}
          </div>
        </header>
        <LineChart series={priceSeries} bands={bands} height={300} format={fmt} label={`Closing price with selected moving averages, last ${view.b.length} bars`} />
        <p className="evidence">Moving averages smooth past closes; they lag price and say nothing certain about the future. Bollinger bands = 20-day average ± 2 standard deviations. Showing the last {view.b.length} bars.</p>
      </section>

      <div className="grid cols-2">
        <section className="panel" aria-label="RSI">
          <header><h2>RSI (14)</h2></header>
          {rsiPts.length > 1 && first && end ? (
            <LineChart
              series={[{ name: 'RSI', points: rsiPts, color: 'var(--accent-2)' }, { name: '70', points: [{ t: rsiPts[0].t, v: 70 }, { t: rsiPts[rsiPts.length - 1].t, v: 70 }], color: 'var(--neg)', dashed: true, width: 1 }, { name: '30', points: [{ t: rsiPts[0].t, v: 30 }, { t: rsiPts[rsiPts.length - 1].t, v: 30 }], color: 'var(--pos)', dashed: true, width: 1 }]}
              height={170} format={(v) => v.toFixed(0)} label="Relative strength index with 30 and 70 reference lines" />
          ) : <p className="muted">Needs more bars.</p>}
        </section>
        <section className="panel" aria-label="MACD">
          <header><h2>MACD (12, 26, 9)</h2></header>
          {pts(view.b, view.macd).length > 1 ? (
            <LineChart series={[{ name: 'MACD', points: pts(view.b, view.macd), color: 'var(--accent)' }, { name: 'Signal', points: pts(view.b, view.signal), color: '#fbbf24', dashed: true }]} height={170} format={(v) => v.toFixed(3)} label="MACD and signal line" />
          ) : <p className="muted">Needs at least about 35 bars.</p>}
        </section>
      </div>

      <div className="grid cols-2">
        <section className="panel" aria-label="What the indicators show">
          <header><h2>What the indicators show</h2></header>
          <ul className="plain">{readings.map((r) => <li key={r.name}><b>{r.name}: <span className="num">{r.value}</span></b>. {r.plain}</li>)}</ul>
          <p className="evidence">These describe the past. None of them says whether to buy or sell.</p>
        </section>
        <section className="panel" aria-label="Support and resistance">
          <header><h2>Support and resistance (swing levels)</h2></header>
          <dl className="kv">
            <dt>Resistance</dt><dd className="num">{view.snap.levels.resistances.length ? view.snap.levels.resistances.map((v) => fmtPrice(v, currency)).join(' · ') : '–'}</dd>
            <dt>Support</dt><dd className="num">{view.snap.levels.supports.length ? view.snap.levels.supports.map((v) => fmtPrice(v, currency)).join(' · ') : '–'}</dd>
            <dt>ATR (14)</dt><dd className="num">{view.snap.atr14 != null ? `${view.snap.atr14.toFixed(3)} (${view.snap.atrPct?.toFixed(2)}% of price)` : '–'}</dd>
            <dt>10-day / 60-day momentum</dt><dd className="num">{view.snap.momentum10 != null ? `${view.snap.momentum10.toFixed(2)}%` : '–'} / {view.snap.momentum60 != null ? `${view.snap.momentum60.toFixed(2)}%` : '–'}</dd>
          </dl>
          <p className="evidence">Levels are past swing highs and lows (pivots over 5 bars each side, nearby ones merged within 1.5%). Prices can and do break through them.</p>
        </section>
      </div>
    </div>
  );
}
