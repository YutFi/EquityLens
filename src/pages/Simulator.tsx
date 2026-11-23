import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { summarise, validateTxn, type Portfolio, type Txn, type TxnType } from '../analytics/portfolio';
import { Page } from '../components/Layout';
import { fmtNumber, fmtPct, signClass } from '../core/format';
import { useApp } from '../state/AppContext';
import { useMetrics } from '../state/useMetrics';

const id = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);

export function Simulator() {
  const app = useApp();
  const { all, byId } = useMetrics();
  const lists = app.state.portfolios;
  const [sel, setSel] = useState<string>('');
  const [name, setName] = useState('');
  const cur = lists.find((p) => p.id === sel) ?? lists[0];

  const [form, setForm] = useState({ securityId: '', date: today(), type: 'buy' as TxnType, shares: '', price: '', fees: '0' });
  const [err, setErr] = useState<string | null>(null);

  const summary = useMemo(() => (cur ? summarise(cur, (sid) => byId[sid]?.last ?? null) : null), [cur, byId]);
  const sectorWeights = useMemo(() => {
    if (!summary || summary.totalValue == null || summary.totalValue <= 0) return null;
    const w = new Map<string, number>();
    for (const pos of summary.positions.filter((x) => x.shares > 1e-9)) {
      const k = byId[pos.securityId]?.security.sector ?? 'Unclassified';
      w.set(k, (w.get(k) ?? 0) + (pos.marketValue ?? 0));
    }
    return [...w.entries()].map(([k, v]) => ({ sector: k, pct: (v / (summary.totalValue as number)) * 100 })).sort((a, b) => b.pct - a.pct);
  }, [summary, byId]);

  const update = (p: Portfolio) => void app.setPortfolios(lists.map((x) => (x.id === p.id ? p : x)));
  const create = () => {
    if (!name.trim()) return;
    const p: Portfolio = { id: id(), name: name.trim(), currency: 'MYR', createdAt: today(), txns: [] };
    void app.setPortfolios([...lists, p]); setSel(p.id); setName('');
  };
  const add = () => {
    if (!cur) return;
    const t = { securityId: form.securityId || all[0]?.security.id || '', date: form.date, type: form.type, shares: Number(form.shares), price: Number(form.price), fees: Number(form.fees || 0) };
    if (!t.securityId) { setErr('Choose a company with loaded data.'); return; }
    const problem = validateTxn(t, cur.txns);
    if (problem) { setErr(problem); return; }
    setErr(null);
    update({ ...cur, txns: [...cur.txns, { ...t, id: id() } as Txn] });
    setForm({ ...form, shares: '', price: '' });
  };

  return (
    <Page title="Investment Simulator" subtitle="Hypothetical portfolios you type in yourself. No brokerage connection, no real money, saved only on this device.">
      <div className="stack">
        <div className="banner warn"><b>Simulated.</b>Every figure below is based on transactions you entered and the latest loaded closing prices. It is a learning tool, not a record of real holdings or advice.</div>
        <section className="panel" aria-label="Portfolios">
          <div className="row">
            {lists.map((p) => <button key={p.id} type="button" className="chip" aria-selected={cur?.id === p.id} onClick={() => setSel(p.id)}>{p.name}</button>)}
            <input className="input" style={{ maxWidth: 200 }} placeholder="New simulated portfolio" value={name} onChange={(e) => setName(e.target.value)} aria-label="New portfolio name" />
            <button type="button" className="btn primary" disabled={!name.trim()} onClick={create}>Create</button>
          </div>
        </section>

        {!cur ? <div className="panel empty"><h2>No simulated portfolio yet</h2><p>Create one above, then add hypothetical trades.</p></div> : all.length === 0 ? (
          <div className="panel empty"><h2>No companies with data yet</h2><p>Load price history first.</p><Link className="btn primary" to="/data-sources">Go to Data Sources</Link></div>
        ) : (
          <>
            <section className="panel" aria-label="Add transaction">
              <header><h2>Add a hypothetical transaction to “{cur.name}”</h2></header>
              <div className="row" style={{ alignItems: 'end' }}>
                <label className="field">Company<select className="input" value={form.securityId || all[0].security.id} onChange={(e) => setForm({ ...form, securityId: e.target.value })}>{all.map((m) => <option key={m.security.id} value={m.security.id}>{m.security.code} · {m.security.name}</option>)}</select></label>
                <label className="field">Type<select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TxnType })}><option value="buy">Buy</option><option value="sell">Sell</option><option value="dividend">Dividend received</option></select></label>
                <label className="field">Date<input className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="YYYY-MM-DD" /></label>
                <label className="field">{form.type === 'dividend' ? 'Shares held' : 'Shares'}<input className="input num" inputMode="decimal" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} /></label>
                <label className="field">{form.type === 'dividend' ? 'Dividend per share' : 'Price per share'}<input className="input num" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
                <label className="field">Fees<input className="input num" inputMode="decimal" value={form.fees} onChange={(e) => setForm({ ...form, fees: e.target.value })} /></label>
                <button type="button" className="btn primary" onClick={add}>Add</button>
              </div>
              {err && <div className="banner err" role="alert" style={{ marginTop: 8 }}>{err}</div>}
              <p className="evidence">Dividends are only what you enter; EquityLens does not know real dividend dates or amounts. Fees are whatever you type (brokerage, stamp duty).</p>
            </section>

            {summary && (
              <>
                {summary.problems.map((p) => <div key={p} className="banner warn" role="status">{p}</div>)}
                <section className="grid cols-4" aria-label="Portfolio summary">
                  <div className="panel stat"><div className="label">Cost of open positions</div><div className="value">{fmtNumber(summary.totalCost, 2)}</div></div>
                  <div className="panel stat hero"><div className="label">Simulated value</div><div className="value">{summary.totalValue == null ? '–' : fmtNumber(summary.totalValue, 2)}</div><div className="sub">At latest loaded closes</div></div>
                  <div className="panel stat"><div className="label">Unrealised P/L</div><div className={`value ${signClass(summary.unrealised)}`}>{summary.unrealised == null ? '–' : fmtNumber(summary.unrealised, 2)}</div></div>
                  <div className="panel stat"><div className="label">Total return (incl. realised and dividends)</div><div className={`value ${signClass(summary.totalReturn)}`} style={{ fontSize: 18 }}>{summary.totalReturn == null ? '–' : `${fmtNumber(summary.totalReturn, 2)} (${fmtPct(summary.totalReturnPct, 1)})`}</div><div className="sub">Realised {fmtNumber(summary.realised, 2)} · Dividends {fmtNumber(summary.dividends, 2)} · Fees {fmtNumber(summary.fees, 2)}</div></div>
                </section>
                <section className="panel" aria-label="Positions">
                  <header><h2>Positions</h2></header>
                  <div className="table-wrap"><table className="t">
                    <caption className="sr-only">Simulated positions</caption>
                    <thead><tr><th>Company</th><th className="r">Shares</th><th className="r">Avg cost</th><th className="r">Last close</th><th className="r">Value</th><th className="r">Unrealised</th><th className="r">Realised</th><th className="r">Dividends</th></tr></thead>
                    <tbody>
                      {summary.positions.map((p) => (
                        <tr key={p.securityId}><td className="num">{byId[p.securityId]?.security.code ?? p.securityId}</td><td className="r num">{p.shares}</td><td className="r num">{p.shares > 0 ? p.avgCost.toFixed(3) : '–'}</td><td className="r num">{p.lastPrice == null ? 'no price' : p.lastPrice.toFixed(3)}</td><td className="r num">{p.marketValue == null ? '–' : fmtNumber(p.marketValue, 2)}</td><td className={`r num ${signClass(p.unrealised)}`}>{p.unrealised == null ? '–' : `${fmtNumber(p.unrealised, 2)} (${fmtPct(p.unrealisedPct, 1)})`}</td><td className={`r num ${signClass(p.realised)}`}>{fmtNumber(p.realised, 2)}</td><td className="r num">{fmtNumber(p.dividends, 2)}</td></tr>
                      ))}
                    </tbody>
                  </table></div>
                  {sectorWeights && <p className="num" style={{ marginTop: 8 }}><b>Sector weights:</b> {sectorWeights.map((s) => `${s.sector} ${s.pct.toFixed(0)}%`).join(' · ')}{sectorWeights.length === 1 && <span className="muted"> (all in one sector: concentrated)</span>}</p>}
                  <p className="evidence">Average-cost method: a buy adds shares and cost (fees included); a sale realises (price − average cost) × shares − fees and reduces cost proportionally.</p>
                </section>
                <section className="panel" aria-label="Transactions">
                  <header><h2>Transactions</h2><button type="button" className="btn danger" onClick={() => { if (window.confirm(`Delete the simulated portfolio “${cur.name}”?`)) void app.setPortfolios(lists.filter((p) => p.id !== cur.id)); }}>Delete portfolio</button></header>
                  <div className="table-wrap"><table className="t">
                    <caption className="sr-only">Entered transactions</caption>
                    <thead><tr><th>Date</th><th>Type</th><th>Company</th><th className="r">Shares</th><th className="r">Price</th><th className="r">Fees</th><th /></tr></thead>
                    <tbody>
                      {[...cur.txns].sort((a, b) => (a.date < b.date ? 1 : -1)).map((t) => (
                        <tr key={t.id}><td className="num">{t.date}</td><td>{t.type}</td><td className="num">{byId[t.securityId]?.security.code ?? t.securityId}</td><td className="r num">{t.shares}</td><td className="r num">{t.price}</td><td className="r num">{t.fees}</td>
                          <td><button type="button" className="btn" onClick={() => update({ ...cur, txns: cur.txns.filter((x) => x.id !== t.id) })}>Remove</button></td></tr>
                      ))}
                    </tbody>
                  </table></div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </Page>
  );
}
