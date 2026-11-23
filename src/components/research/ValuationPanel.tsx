import { useMemo, useState } from 'react';
import type { Bar } from '../../core/types';
import type { Fundamentals } from '../../core/fundamentals';
import { runValuation, type PeerMultiples } from '../../analytics/valuation';
import { fmtPct, fmtPrice } from '../../core/format';

type Over = Partial<{ discountRate: number; terminalGrowth: number; growth: number; years: number }>;

/** Valuation estimates with every assumption visible and adjustable. Estimates only, never a price target. */
export function ValuationPanel({ fundamentals, price, bars, peers, currency, onEdit }: { fundamentals: Fundamentals | null; price: number | null; bars: Bar[]; peers: PeerMultiples; currency: string; onEdit: () => void }) {
  const [over, setOver] = useState<Over>({});
  const res = useMemo(() => (fundamentals && fundamentals.periods.length ? runValuation({ fundamentals, price, bars, peers, overrides: over }) : null), [fundamentals, price, bars, peers, over]);

  if (!fundamentals || !res) {
    return <div className="panel empty"><h2>Valuation needs company financials</h2><p>Enter or import annual statements first. Nothing is estimated without them.</p><button type="button" className="btn primary" onClick={onEdit}>Enter or import financials</button></div>;
  }
  const p = (v: number | null) => (v == null ? '–' : fmtPrice(v, currency));
  const set = (k: keyof Over, raw: string) => setOver((o) => { const n = Number(raw); const next = { ...o }; if (raw === '' || !Number.isFinite(n)) delete next[k]; else next[k] = n; return next; });

  return (
    <div className="stack">
      <div className="banner warn"><b>Estimates, not prices.</b>These ranges come from simple models with the assumptions listed below. Change an assumption and the answer changes: that is the lesson. This is not a recommendation to buy or sell.</div>

      <section className="grid cols-4" aria-label="Summary">
        <div className="panel stat"><div className="label">Conservative</div><div className="value">{p(res.conservative)}</div></div>
        <div className="panel stat hero"><div className="label">Fair-value estimate (median of methods)</div><div className="value">{p(res.fairValue)}</div><div className="sub">{res.methods.filter((m) => m.applicable && m.base != null).length} method(s) applied</div></div>
        <div className="panel stat"><div className="label">Optimistic</div><div className="value">{p(res.optimistic)}</div></div>
        <div className="panel stat"><div className="label">Latest close / margin of safety</div><div className="value" style={{ fontSize: 17 }}>{p(res.price)}</div><div className="sub">{res.marginOfSafetyPct == null ? 'Not available' : `${fmtPct(res.marginOfSafetyPct, 1)} of the estimate (positive = price below estimate)`}</div></div>
      </section>
      {res.warnings.map((w) => <div key={w} className="banner warn" role="status">{w}</div>)}

      <section className="panel" aria-label="Assumptions">
        <header><h2>Assumptions you can change</h2><button type="button" className="btn" disabled={!Object.keys(over).length} onClick={() => setOver({})}>Reset to defaults</button></header>
        <div className="grid cols-4">
          {res.assumptions.map((a) => (
            <label key={a.key} className="field">{a.label} ({a.unit})
              <input className="input num" type="number" step="0.5" value={over[a.key as keyof Over] ?? Math.round(a.value * 100) / 100} onChange={(e) => set(a.key as keyof Over, e.target.value)} />
              <span className="muted">{a.source}. {a.help}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="panel" aria-label="Methods">
        <header><h2>Methods</h2></header>
        <div className="table-wrap">
          <table className="t">
            <caption className="sr-only">Valuation methods and their estimates</caption>
            <thead><tr><th>Method</th><th className="r">Conservative</th><th className="r">Base</th><th className="r">Optimistic</th><th>Status</th></tr></thead>
            <tbody>
              {res.methods.map((m) => (
                <tr key={m.id}><td>{m.name}</td><td className="r num">{p(m.conservative)}</td><td className="r num">{p(m.base)}</td><td className="r num">{p(m.optimistic)}</td><td className="dim wrap">{m.applicable ? 'Applied' : `Not applied: ${m.reason}`}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <details style={{ marginTop: 8 }}>
          <summary>Limitations of each method</summary>
          {res.methods.filter((m) => m.applicable).map((m) => <div key={m.id}><b>{m.name}</b><ul className="plain">{m.limitations.map((l) => <li key={l}>{l}</li>)}</ul></div>)}
        </details>
        <p className="evidence">Fair-value estimate = median of the applicable methods&apos; base values. Margin of safety = (estimate − price) ÷ estimate. A positive margin can mean the market sees risks the model does not.</p>
      </section>
    </div>
  );
}
