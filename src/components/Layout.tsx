import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MARKET_LIST, MARKETS } from '../core/markets';
import { getMarketStatus } from '../core/marketStatus';
import type { MarketId } from '../core/types';
import { NAV } from '../nav';
import { useApp } from '../state/AppContext';
import { Disclaimer } from './Disclaimer';
import { ImportDialog } from './ImportDialog';

interface ImportUi { openImport: (securityId?: string) => void }
const ImportCtx = createContext<ImportUi>({ openImport: () => undefined });
export const useImportDialog = () => useContext(ImportCtx);

function SearchBox() {
  const app = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return app.securities
      .filter((x) => x.market === app.state.settings.market && (x.code.toLowerCase().includes(s) || x.name.toLowerCase().includes(s)))
      .sort((a, b) => Number(b.code.toLowerCase().startsWith(s)) - Number(a.code.toLowerCase().startsWith(s)) || a.code.localeCompare(b.code))
      .slice(0, 8);
  }, [q, app.securities, app.state.settings.market]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (id: string) => { setQ(''); setOpen(false); nav(`/company/${encodeURIComponent(id)}`); };

  return (
    <div className="grow" ref={wrap}>
      <label className="sr-only" htmlFor="global-search">Search companies by name or code</label>
      <input
        id="global-search" className="input" placeholder="Search company name or code…" autoComplete="off"
        role="combobox" aria-expanded={open && results.length > 0} aria-controls="search-list"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter' && results[active]) go(results[active].id);
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && q.trim() && (
        <div className="search-results" id="search-list" role="listbox">
          {results.length === 0 && <div className="muted" style={{ padding: 10 }}>No match in the directory. Import data to add a security.</div>}
          {results.map((r, i) => (
            <button key={r.id} type="button" role="option" aria-selected={i === active} onClick={() => go(r.id)}>
              <span><b className="num">{r.code}</b> {r.name}</span>
              <span className="muted">{app.state.seriesById[r.id] ? 'data loaded' : 'no data'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketSelector() {
  const app = useApp();
  return (
    <label className="field" style={{ gridAutoFlow: 'column', alignItems: 'center', gap: 8 }}>
      <span className="sr-only">Market</span>
      <select
        className="input" aria-label="Market" value={app.state.settings.market}
        onChange={(e) => app.setSettings({ market: e.target.value as MarketId })}
      >
        {MARKET_LIST.map((m) => (
          <option key={m.id} value={m.id} disabled={m.status === 'planned'}>
            {m.shortName} · {m.currency}{m.status === 'planned' ? ` (Phase ${m.plannedPhase})` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Layout() {
  const app = useApp();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  const [importing, setImporting] = useState<{ preset?: string } | null>(null);
  const market = MARKETS[app.state.settings.market];
  const status = getMarketStatus(market);

  useEffect(() => { setMenu(false); }, [loc.pathname]);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  const ctx = useMemo<ImportUi>(() => ({ openImport: (id) => setImporting({ preset: id }) }), []);

  return (
    <ImportCtx.Provider value={ctx}>
      <a className="skip" href="#main">Skip to content</a>
      <div className="shell">
        <aside className={`sidebar${menu ? ' open' : ''}`} aria-label="Primary">
          <div className="brand"><b>EQUITYLENS</b><small>See Beyond the Stock Price.</small></div>
          <ul className="nav">
            {NAV.map((n) => (
              <li key={n.path}>
                <NavLink to={n.path} end={n.path === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                  <span>{n.label}</span>
                  {n.status === 'planned' && <span className="tag" title="Not built yet">{n.phase ? `Phase ${n.phase}` : 'Planned'}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="sidebar-foot">v0.1.0 · Phase 1 foundation<br />Research &amp; education only.</div>
        </aside>

        <header className="header">
          <button type="button" className="btn menu-btn" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>☰</button>
          <MarketSelector />
          <SearchBox />
          <span className="muted" title={status.holidayCaveat ? 'Exchange holidays are not included in this status.' : ''}>
            {market.shortName} {status.localTime} · {status.label}
          </span>
          <div className="seg" role="group" aria-label="Analysis level">
            <button type="button" aria-pressed={app.state.settings.level === 'beginner'} onClick={() => app.setSettings({ level: 'beginner' })}>Beginner</button>
            <button type="button" aria-pressed={app.state.settings.level === 'advanced'} onClick={() => app.setSettings({ level: 'advanced' })}>Advanced</button>
          </div>
          <button type="button" className="btn" onClick={() => app.setSettings({ theme: app.state.settings.theme === 'dark' ? 'light' : 'dark' })} aria-label={`Switch to ${app.state.settings.theme === 'dark' ? 'light' : 'dark'} theme`}>
            {app.state.settings.theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
          <button type="button" className="btn primary" onClick={() => setImporting({})}>Import data</button>
        </header>

        <main className="main" id="main" tabIndex={-1}>
          {app.state.storageError && <div className="banner err" role="alert"><b>Storage problem.</b>{app.state.storageError}</div>}
          {app.state.failures.map((f) => (
            <div key={f.providerId} className="banner warn" role="alert"><b>{f.providerName} unavailable.</b>{f.message} The rest of the app still works.</div>
          ))}
          <Outlet />
        </main>
        <Disclaimer />
      </div>
      {importing && <ImportDialog presetSecurityId={importing.preset} onClose={() => setImporting(null)} />}
    </ImportCtx.Provider>
  );
}

export function Page({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="page-head">
        <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        {actions && <div className="row">{actions}</div>}
      </div>
      {children}
    </>
  );
}
