import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { evaluateAlerts, hasRule, RULE_LABELS, type AlertRule, type Watchlist as WL } from '../analytics/alerts';
import { Page } from '../components/Layout';
import { fmtPct, signClass } from '../core/format';
import { useApp } from '../state/AppContext';
import { useMetrics } from '../state/useMetrics';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const RULE_KEYS = Object.keys(RULE_LABELS) as (keyof AlertRule)[];

export function Watchlist() {
  const app = useApp();
  const { all, byId } = useMetrics();
  const lists = app.state.watchlists;
  const [name, setName] = useState('');
  const [selId, setSelId] = useState('');
  const [add, setAdd] = useState('');
  const [perm, setPerm] = useState<string>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const cur = lists.find((l) => l.id === selId) ?? lists[0];

  const triggered = useMemo(() => {
    const out: { id: string; msgs: string[] }[] = [];
    for (const it of cur?.items ?? []) { const msgs = evaluateAlerts(it.rule, byId[it.securityId] ?? null); if (msgs.length) out.push({ id: it.securityId, msgs }); }
    return out;
  }, [cur, byId]);

  // Browser notification only while this page is open and an alert newly appears. No background monitoring exists.
  useEffect(() => {
    if (perm !== 'granted' || !triggered.length) return;
    const key = `equitylens.notified.${new Date().toISOString().slice(0, 10)}`;
    let seen: string[] = [];
    try { seen = JSON.parse(sessionStorage.getItem(key) ?? '[]') as string[]; } catch { /* ignore */ }
    const fresh = triggered.flatMap((t) => t.msgs).filter((m) => !seen.includes(m));
    if (!fresh.length) return;
    try { new Notification('EquityLens alert', { body: fresh.slice(0, 3).join('\n') }); sessionStorage.setItem(key, JSON.stringify([...seen, ...fresh])); } catch { /* notifications blocked */ }
  }, [triggered, perm]);

  const save = (l: WL) => void app.setWatchlists(lists.map((x) => (x.id === l.id ? l : x)));
  const setRule = (secId: string, k: keyof AlertRule, raw: string) => {
    if (!cur) return;
    save({ ...cur, items: cur.items.map((it) => { if (it.securityId !== secId) return it; const rule = { ...it.rule }; const n = Number(raw); if (raw.trim() === '' || !Number.isFinite(n)) delete rule[k]; else rule[k] = n; return { ...it, rule }; }) });
  };

  return (
    <Page title="Watchlist" subtitle="Local watchlists with simple alert rules. Saved only on this device.">
      <div className="stack">
        <div className="banner info"><b>How alerts work.</b>Alerts are checked only while EquityLens is open and shows the data you have loaded. There is no server and no background monitoring, so nothing can notify you when the site is closed, and an alert is only as fresh as the last data you imported.</div>
        <section className="panel" aria-label="Lists">
          <div className="row">
            {lists.map((l) => <button key={l.id} type="button" className="chip" aria-selected={cur?.id === l.id} onClick={() => setSelId(l.id)}>{l.name}</button>)}
            <input className="input" style={{ maxWidth: 200 }} value={name} placeholder="New watchlist" onChange={(e) => setName(e.target.value)} aria-label="New watchlist name" />
            <button type="button" className="btn primary" disabled={!name.trim()} onClick={() => { const l: WL = { id: uid(), name: name.trim(), items: [] }; void app.setWatchlists([...lists, l]); setSelId(l.id); setName(''); }}>Create</button>
            {perm !== 'unsupported' && perm !== 'granted' && <button type="button" className="btn" onClick={() => void Notification.requestPermission().then(setPerm)}>Allow browser notifications</button>}
            {perm === 'granted' && <span className="badge historical">Notifications allowed</span>}
            {perm === 'denied' && <span className="muted">Notifications are blocked in your browser settings.</span>}
          </div>
        </section>

        {!cur ? <div className="panel empty"><h2>No watchlist yet</h2><p>Create one above.</p></div> : all.length === 0 ? (
          <div className="panel empty"><h2>No companies with data yet</h2><p>Load price history first.</p><Link className="btn primary" to="/data-sources">Go to Data Sources</Link></div>
        ) : (
          <>
            {triggered.length > 0 && (
              <section className="panel" aria-label="Triggered alerts"><header><h2>Triggered now</h2></header>
                <ul className="plain">{triggered.flatMap((t) => t.msgs.map((m) => <li key={m}>{m}</li>))}</ul></section>
            )}
            <section className="panel" aria-label="Add a company to this list">
              <div className="row">
                <label className="field">Add company<select className="input" value={add} onChange={(e) => setAdd(e.target.value)}><option value="">Choose…</option>{all.filter((m) => !cur.items.some((i) => i.securityId === m.security.id)).map((m) => <option key={m.security.id} value={m.security.id}>{m.security.code} · {m.security.name}</option>)}</select></label>
                <button type="button" className="btn primary" disabled={!add} style={{ alignSelf: 'end' }} onClick={() => { save({ ...cur, items: [...cur.items, { securityId: add, addedAt: new Date().toISOString().slice(0, 10), rule: {} }] }); setAdd(''); }}>Add</button>
                <button type="button" className="btn danger" style={{ alignSelf: 'end', marginLeft: 'auto' }} onClick={() => { if (window.confirm(`Delete the watchlist “${cur.name}”?`)) void app.setWatchlists(lists.filter((l) => l.id !== cur.id)); }}>Delete list</button>
              </div>
            </section>
            {cur.items.length === 0 ? <div className="panel empty"><h2>This list is empty</h2></div> : cur.items.map((it) => {
              const m = byId[it.securityId];
              const fired = triggered.find((t) => t.id === it.securityId);
              return (
                <section key={it.securityId} className="panel" aria-label={`Watch ${m?.security.code ?? it.securityId}`}>
                  <header>
                    <h2>{m ? <Link to={`/company/${encodeURIComponent(m.security.id)}`}>{m.security.code}</Link> : it.securityId} <span className="dim" style={{ fontWeight: 400 }}>{m?.security.name}</span></h2>
                    <span className="num">{m ? <>{m.last.toFixed(3)} <span className={signClass(m.changePct)}>{m.changePct == null ? '' : fmtPct(m.changePct)}</span> <span className="muted">as of {m.asOf}</span></> : <span className="muted">no data loaded</span>}</span>
                  </header>
                  <div className="grid cols-4">
                    {RULE_KEYS.map((k) => <label key={k} className="field">{RULE_LABELS[k]}<input className="input num" inputMode="decimal" defaultValue={it.rule[k] ?? ''} onBlur={(e) => setRule(it.securityId, k, e.target.value)} /></label>)}
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    {fired ? <span className="badge incomplete">Alert active</span> : hasRule(it.rule) ? <span className="muted">Rules set, none triggered by the loaded data.</span> : <span className="muted">No alert rules set.</span>}
                    <button type="button" className="btn" style={{ marginLeft: 'auto' }} onClick={() => save({ ...cur, items: cur.items.filter((x) => x.securityId !== it.securityId) })}>Remove</button>
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </Page>
  );
}
