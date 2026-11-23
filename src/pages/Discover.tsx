import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable, type Column } from '../components/DataTable';
import { Page, useImportDialog } from '../components/Layout';
import { QualityBadge } from '../components/QualityBadge';
import { arrow, fmtPct, fmtPrice, signClass } from '../core/format';
import { MARKETS } from '../core/markets';
import type { Security } from '../core/types';
import { pctChange } from '../analytics/returns';
import { useApp } from '../state/AppContext';

export function Discover() {
  const app = useApp();
  const { openImport } = useImportDialog();
  const market = MARKETS[app.state.settings.market];
  const [sector, setSector] = useState('');
  const [onlyLoaded, setOnlyLoaded] = useState(false);

  const inMarket = useMemo(() => app.securities.filter((s) => s.market === market.id), [app.securities, market.id]);
  const sectors = useMemo(() => [...new Set(inMarket.map((s) => s.sector).filter((x): x is string => !!x))].sort(), [inMarket]);
  const rows = useMemo(
    () => inMarket.filter((s) => (!sector || s.sector === sector) && (!onlyLoaded || app.state.seriesById[s.id])),
    [inMarket, sector, onlyLoaded, app.state.seriesById],
  );

  const cols: Column<Security>[] = [
    { key: 'code', label: 'Code', render: (s) => <Link to={`/company/${encodeURIComponent(s.id)}`} className="num"><b>{s.code}</b></Link>, sort: (s) => s.code },
    { key: 'name', label: 'Name', render: (s) => s.name, sort: (s) => s.name },
    { key: 'type', label: 'Type', render: (s) => (s.kind === 'index' ? 'Index' : 'Company'), sort: (s) => s.kind },
    { key: 'sector', label: 'Sector', render: (s) => s.sector ?? <span className="muted">–</span>, sort: (s) => s.sector ?? null },
    {
      key: 'data', label: 'Data availability',
      render: (s) => {
        const ser = app.state.seriesById[s.id];
        return ser ? <QualityBadge quality={ser.quality} /> : <span className="badge unavailable" title="No price data in this browser">No local data</span>;
      },
      sort: (s) => (app.state.seriesById[s.id] ? 0 : 1),
    },
    {
      key: 'last', label: 'Last close', align: 'right',
      render: (s) => { const b = app.state.seriesById[s.id]?.bars.at(-1); return b ? fmtPrice(b.c, s.currency) : '–'; },
      sort: (s) => app.state.seriesById[s.id]?.bars.at(-1)?.c ?? null,
    },
    {
      key: 'chg', label: '1D %', align: 'right',
      render: (s) => {
        const bars = app.state.seriesById[s.id]?.bars;
        const p = bars && bars.length > 1 ? pctChange(bars[bars.length - 2].c, bars[bars.length - 1].c) : null;
        return <span className={signClass(p)}>{p == null ? '–' : `${arrow(p)} ${fmtPct(p)}`}</span>;
      },
      sort: (s) => { const b = app.state.seriesById[s.id]?.bars; return b && b.length > 1 ? pctChange(b[b.length - 2].c, b[b.length - 1].c) : null; },
    },
  ];

  return (
    <Page
      title="Discover"
      subtitle={`Browse and search ${market.name} securities in the directory. Filters on valuation, growth and yield arrive with the screener in Phase 5.`}
      actions={<button type="button" className="btn primary" onClick={() => openImport()}>Import price history</button>}
    >
      <div className="banner info">
        <b>About this directory.</b>It is a short, hand-compiled, unverified seed list plus anything you import. It is not the complete Bursa Malaysia listing or the official KLCI constituent list. Any security can be added by importing data for it.
      </div>
      <div className="panel">
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="field">Sector
            <select className="input" value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">All sectors</option>
              {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="row" style={{ marginTop: 16 }}>
            <input type="checkbox" checked={onlyLoaded} onChange={(e) => setOnlyLoaded(e.target.checked)} />
            <span className="dim">Only securities with data loaded</span>
          </label>
          <span className="muted" style={{ marginTop: 16 }}>{rows.length} shown</span>
        </div>
        <DataTable rows={rows} columns={cols} rowKey={(s) => s.id} caption="Securities" initialSort={{ key: 'code', dir: 'asc' }} filterText={(s) => `${s.code} ${s.name} ${s.sector ?? ''}`} pageSize={40} emptyText="No securities match." />
      </div>
    </Page>
  );
}
