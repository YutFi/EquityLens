import { useState } from 'react';
import { Page } from '../components/Layout';
import { MARKETS } from '../core/markets';
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
          <header><h2>Backup and restore</h2></header>
          <p className="dim">Export your imported data and settings as a JSON file, and restore it later or on another device. {seriesCount} series currently stored.</p>
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
          <p className="dim">Deletes every imported series, added securities and saved preferences from this browser. Cannot be undone; export a backup first.</p>
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
            <li>The page makes no requests to any data provider in this release. Fonts and scripts are served from the same origin.</li>
          </ul>
        </section>
      </div>
    </Page>
  );
}
