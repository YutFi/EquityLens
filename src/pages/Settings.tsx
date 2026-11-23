import { useState } from 'react';
import { Page } from '../components/Layout';
import { MARKETS } from '../core/markets';
import { loadEodhdKey, saveEodhdKey } from '../data/providers/eodhd';
import { DEFAULT_BRIDGE_URL, describeFailure, fetchBridgeHealth, loadBridgeConfig, normaliseBridgeUrl, saveBridgeConfig } from '../data/providers/moomoo';
import { useApp } from '../state/AppContext';

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function Settings() {
  const app = useApp();
  const s = app.state.settings;
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [key, setKey] = useState(loadEodhdKey());
  const [keySaved, setKeySaved] = useState(false);
  const [bridgeOn, setBridgeOn] = useState(loadBridgeConfig().enabled);
  const [bridgeUrl, setBridgeUrl] = useState(loadBridgeConfig().url);
  const [bridgeMsg, setBridgeMsg] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const bridgeUrlOk = normaliseBridgeUrl(bridgeUrl) != null;
  async function testBridge() {
    setTesting(true); setBridgeMsg(null);
    const r = await fetchBridgeHealth(bridgeUrl);
    if (!r.ok) setBridgeMsg({ tone: 'warn', text: describeFailure(r) });
    else if (r.health.source === 'mock') setBridgeMsg({ tone: 'warn', text: `Connected to the bridge (v${r.health.bridgeVersion}) but it is in MOCK mode: all data is synthetic.` });
    else setBridgeMsg({ tone: 'info', text: `Connected to the bridge (v${r.health.bridgeVersion}, ${r.health.readOnly ? 'read-only' : 'NOT reporting read-only'}). OpenD ${r.health.opendConnected ? 'is connected' : 'is NOT connected'}${r.health.quoteLoggedIn === false ? ' but quote login is not complete' : ''}${r.health.note ? `: ${r.health.note}` : ''}. This confirms the bridge is up, not that your account has quote rights for Bursa.` });
    setTesting(false);
  }
  const seriesCount = Object.keys(app.state.seriesById).length;

  return (
    <Page title="Settings" subtitle="Everything here is stored in this browser only. There are no accounts.">
      <div className="stack">
        <section className="panel">
          <header><h2>Preferences</h2></header>
          <dl className="kv" style={{ alignItems: 'center' }}>
            <dt>Theme</dt>
            <dd><div className="seg" role="group" aria-label="Theme">
              <button type="button" aria-pressed={s.theme === 'dark'} onClick={() => app.setSettings({ theme: 'dark' })}>Dark</button>
              <button type="button" aria-pressed={s.theme === 'light'} onClick={() => app.setSettings({ theme: 'light' })}>Light</button>
            </div></dd>
            <dt>Analysis level</dt>
            <dd><div className="seg" role="group" aria-label="Analysis level">
              <button type="button" aria-pressed={s.level === 'beginner'} onClick={() => app.setSettings({ level: 'beginner' })}>Beginner</button>
              <button type="button" aria-pressed={s.level === 'advanced'} onClick={() => app.setSettings({ level: 'advanced' })}>Advanced</button>
            </div></dd>
            <dt>Market</dt><dd>{MARKETS[s.market].name} ({MARKETS[s.market].currency}). Change it from the header selector.</dd>
          </dl>
        </section>

        <section className="panel">
          <header><h2>Demo data</h2></header>
          <p className="dim">Fictional companies with synthetic prices, generated in your browser, to explore the interface. Not real market data.</p>
          <div className="row">
            <button type="button" className="btn" onClick={() => void app.loadDemo()}>{app.hasDemoData ? 'Regenerate' : 'Load'} synthetic demo data</button>
            {app.hasDemoData && (
              <button type="button" className="btn" onClick={async () => {
                for (const sec of app.securities.filter((x) => x.origin === 'demo')) await app.removeData(sec.id);
                setMsg('Demo data removed.');
              }}>Remove demo data</button>
            )}
          </div>
        </section>

        <section className="panel">
          <header><h2>Optional live prices: EODHD key (experimental)</h2><span className="badge estimated">Experimental · untested live</span></header>
          <p className="dim">
            EquityLens works fully without this. If you have your own free key from EOD Historical Data, a <b>Fetch from EODHD</b> button appears on Bursa company pages. Its free plan documents about 20 requests a day and one year of history, for personal use. The key is stored only in this browser and sent only to eodhd.com. It is never included in backups.
          </p>
          <p className="evidence">Not verified: this build could not reach eodhd.com, so whether the free plan returns Bursa data and whether the browser is allowed to call the API (CORS) is unconfirmed. If the call fails you will see why, and CSV import always works. Fetched data is labelled &quot;your key&quot; and never &quot;verified&quot;.</p>
          <div className="row">
            <label className="field" style={{ minWidth: 260 }}>API key
              <input className="input" type="password" autoComplete="off" value={key} onChange={(e) => { setKey(e.target.value); setKeySaved(false); }} placeholder="Paste your own key" />
            </label>
            <button type="button" className="btn primary" style={{ alignSelf: 'end' }} onClick={() => { saveEodhdKey(key); setKeySaved(true); }}>Save key</button>
            {key && <button type="button" className="btn" style={{ alignSelf: 'end' }} onClick={() => { setKey(''); saveEodhdKey(''); setKeySaved(false); }}>Remove key</button>}
            {keySaved && <span className="muted" style={{ alignSelf: 'end' }} role="status">Saved on this device.</span>}
          </div>
        </section>

        <section className="panel">
          <header><h2>Optional live data: Moomoo local bridge (experimental)</h2><span className="badge estimated">Experimental · untested live</span></header>
          <p className="dim">
            If you have a Moomoo account, a small read-only script on your own computer (<code>bridge/moomoo_bridge.py</code>, with Moomoo&apos;s OpenD) can serve daily candles and the latest quote to this page. Turn this on and a <b>Fetch from Moomoo bridge</b> button and a <b>Live quote</b> toggle appear on Bursa company pages. Your Moomoo login stays in OpenD; this page never sees it.
          </p>
          <p className="evidence">
            Not verified: this build had no Moomoo account to test against. The OpenAPI itself is free, but market data needs the quote right on your account, and Moomoo applies quotas. Only addresses on this computer are accepted. Moomoo data is for your own use: do not share or publish it. It is labelled &quot;your Moomoo bridge&quot; and never &quot;verified&quot;. See docs/MOOMOO_BRIDGE.md.
          </p>
          <div className="row">
            <label className="row" style={{ alignSelf: 'end' }}>
              <input type="checkbox" checked={bridgeOn} onChange={(e) => { setBridgeOn(e.target.checked); saveBridgeConfig({ enabled: e.target.checked && bridgeUrlOk, url: normaliseBridgeUrl(bridgeUrl) ?? DEFAULT_BRIDGE_URL }); }} />
              <span>Use the Moomoo bridge</span>
            </label>
            <label className="field" style={{ minWidth: 260 }}>Bridge address
              <input className="input" value={bridgeUrl} aria-invalid={!bridgeUrlOk} onChange={(e) => {
                setBridgeUrl(e.target.value);
                const n = normaliseBridgeUrl(e.target.value);
                saveBridgeConfig({ enabled: bridgeOn && n != null, url: n ?? DEFAULT_BRIDGE_URL });
              }} placeholder={DEFAULT_BRIDGE_URL} />
            </label>
            <button type="button" className="btn" style={{ alignSelf: 'end' }} disabled={testing || !bridgeUrlOk} onClick={() => void testBridge()}>{testing ? 'Testing…' : 'Test connection'}</button>
          </div>
          {!bridgeUrlOk && <p className="evidence" role="alert">Only addresses on this computer are accepted, such as http://127.0.0.1:8765.</p>}
          {bridgeMsg && <div className={`banner ${bridgeMsg.tone}`} role="status" style={{ marginTop: 10 }}>{bridgeMsg.text}</div>}
        </section>

        <section className="panel">
          <header><h2>Backup and restore</h2></header>
          <p className="dim">Export your imported prices, financial statements, simulated portfolios, watchlists and settings as a JSON file, and restore it later or on another device. {seriesCount} series currently stored.</p>
          <div className="row">
            <button type="button" className="btn" onClick={() => download(`equitylens-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(app.exportBackup()))}>Export backup</button>
            <label className="btn" style={{ cursor: 'pointer' }}>
              Restore from backup…
              <input type="file" accept="application/json,.json" className="sr-only" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const err = await app.restoreBackup(JSON.parse(await f.text()));
                  setMsg(err ?? 'Backup restored.');
                } catch {
                  setMsg('That file could not be read as JSON.');
                }
                e.target.value = '';
              }} />
            </label>
          </div>
        </section>

        <section className="panel">
          <header><h2>Clear application data</h2></header>
          <p className="dim">Deletes every imported series, financial statement, portfolio, watchlist, added security, the optional API key and saved preferences and the bridge setting from this browser. Cannot be undone; export a backup first.</p>
          {confirmClear
            ? <div className="row"><button type="button" className="btn danger" onClick={async () => { await app.clearEverything(); setConfirmClear(false); setMsg('All local data cleared.'); }}>Yes, delete everything</button><button type="button" className="btn" onClick={() => setConfirmClear(false)}>Cancel</button></div>
            : <button type="button" className="btn danger" onClick={() => setConfirmClear(true)}>Clear all data…</button>}
        </section>

        {msg && <div className="banner info" role="status">{msg}</div>}

        <section className="panel">
          <header><h2>Privacy</h2></header>
          <ul className="plain">
            <li>No account, no login, no analytics, no tracking, no cookies set by this app.</li>
            <li>Imported files are parsed in your browser and are never uploaded.</li>
            <li>The page makes no requests to any data provider unless you add your own EODHD key and press Fetch on a company page, or switch on the Moomoo bridge, which only ever contacts an address on this same computer. Fonts and scripts are served from the same origin.</li>
            <li>Financial statements you enter, simulated portfolios and watchlists are stored only in this browser.</li>
          </ul>
        </section>
      </div>
    </Page>
  );
}
