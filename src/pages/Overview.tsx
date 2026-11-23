import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildMarketView, relativePerformance, type MarketRow } from '../analytics/market';
import { buildMarketSummary } from '../analytics/summary';
import { PERIODS } from '../analytics/returns';
import { DataTable, type Column } from '../components/DataTable';
import { Heatmap } from '../components/Heatmap';
import { Page, useImportDialog } from '../components/Layout';
import { QualityBadge } from '../components/QualityBadge';
import { Sparkline } from '../components/Sparkline';
import { arrow, fmtCompact, fmtNumber, fmtPct, fmtPrice, signClass } from '../core/format';
import { MARKETS } from '../core/markets';
import { getMarketStatus } from '../core/marketStatus';
import { useApp } from '../state/AppContext';

type TabKey = 'gainers' | 'losers' | 'active' | 'volume' | 'unusual' | 'volatile';
const TABS: { key: TabKey; label: string; sort: (r: MarketRow) => number | null; dir: 'asc' | 'desc'; filter?: (r: MarketRow) => boolean }[] = [
  { key: 'gainers', label: 'Top gainers', sort: (r) => r.changePct, dir: 'desc' },
  { key: 'losers', label: 'Top losers', sort: (r) => r.changePct, dir: 'asc' },
  { key: 'active', label: 'Most active (traded value)', sort: (r) => r.tradedValue, dir: 'desc' },
  { key: 'volume', label: 'Highest volume', sort: (r) => r.volume, dir: 'desc' },
  { key: 'unusual', label: 'Unusual volume', sort: (r) => r.volumeRatio, dir: 'desc', filter: (r) => r.volumeRatio != null },
  { key: 'volatile', label: 'Highest volatility', sort: (r) => r.vol20, dir: 'desc', filter: (r) => r.vol20 != null },
];

function NameCell({ r }: { r: MarketRow }) {
  return <Link to={`/company/${encodeURIComponent(r.security.id)}`}><b className="num">{r.security.code}</b> <span className="dim">{r.security.name}</span></Link>;
}

export function Overview() {
  const app = useApp();
  const { openImport } = useImportDialog();
  const market = MARKETS[app.state.settings.market];
  const advanced = app.state.settings.level === 'advanced';
  const [tab, setTab] = useState<TabKey>('gainers');

  const view = useMemo(() => buildMarketView(app.securities, app.state.seriesById, market.id), [app.securities, app.state.seriesById, market.id]);
  const insights = useMemo(() => buildMarketSummary(view), [view]);
  const status = getMarketStatus(market);
  const bench = view.benchmark;
  const benchSeries = view.benchmarkSecurity ? app.state.seriesById[view.benchmarkSecurity.id] : null;
  const rel = useMemo(() => relativePerformance(view.rows, benchSeries), [view.rows, benchSeries]);
  const loadedCount = view.rows.length + view.staleRows.length;
  const hasDemo = [...view.rows, ...view.staleRows, ...(bench ? [bench] : [])].some((r) => r.series.quality.status === 'demo');

  const tabDef = TABS.find((t) => t.key === tab)!;
  const tabRows = useMemo(() => (tabDef.filter ? view.rows.filter(tabDef.filter) : view.rows), [view.rows, tabDef]);

  const cols: Column<MarketRow>[] = [
    { key: 'name', label: 'Company', render: (r) => <NameCell r={r} />, sort: (r) => r.security.code },
    { key: 'trend', label: '30 bars', render: (r) => <Sparkline values={r.series.bars.slice(-30).map((b) => b.c)} /> },
    { key: 'last', label: 'Last', align: 'right', render: (r) => fmtPrice(r.last, r.security.currency), sort: (r) => r.last },
    { key: 'chg', label: 'Chg', align: 'right', render: (r) => <span className={signClass(r.change)}>{arrow(r.change)} {fmtNumber(r.change, 3)}</span>, sort: (r) => r.change },
    { key: 'pct', label: 'Chg %', align: 'right', render: (r) => <span className={signClass(r.changePct)}>{fmtPct(r.changePct)}</span>, sort: (r) => r.changePct },
    { key: 'vol', label: 'Volume', align: 'right', render: (r) => fmtCompact(r.volume), sort: (r) => r.volume },
    { key: 'ratio', label: 'Vol vs 20d avg', align: 'right', render: (r) => (r.volumeRatio == null ? '–' : `${r.volumeRatio.toFixed(2)}x`), sort: (r) => r.volumeRatio },
    { key: 'tv', label: 'Traded value', align: 'right', render: (r) => fmtCompact(r.tradedValue), sort: (r) => r.tradedValue },
    { key: 'v20', label: '20d volatility', align: 'right', render: (r) => (r.vol20 == null ? '–' : `${r.vol20.toFixed(1)}%`), sort: (r) => r.vol20 },
    ...(advanced ? [{ key: 'asof', label: 'As of', render: (r: MarketRow) => <span className="num">{r.asOf}</span>, sort: (r: MarketRow) => r.asOf }] : []),
  ];

  const relCols: Column<(typeof rel)[number]>[] = [
    { key: 'name', label: 'Company', render: (r) => <Link to={`/company/${encodeURIComponent(r.security.id)}`}><b className="num">{r.security.code}</b> <span className="dim">{r.security.name}</span></Link>, sort: (r) => r.security.code },
    ...PERIODS.map((p): Column<(typeof rel)[number]> => ({
      key: p.key, label: `${p.key} vs benchmark`, align: 'right',
      sort: (r) => r.returns[p.key].relative,
      render: (r) => {
        const x = r.returns[p.key];
        if (x.relative == null) return <span className="muted" title="Not enough history (or no benchmark) to compute this without extrapolating">–</span>;
        return (
          <span className={signClass(x.relative)} title={`Stock ${fmtPct(x.stock)} · benchmark ${fmtPct(x.bench)}`}>
            {arrow(x.relative)} {fmtPct(x.relative)}{advanced && <span className="muted"> ({fmtPct(x.stock)} / {fmtPct(x.bench)})</span>}
          </span>
        );
      },
    })),
  ];

  if (app.state.status === 'loading') return <Page title="Overview"><p className="muted">Loading data stored in this browser…</p></Page>;

  return (
    <Page
      title={`${market.name} · Overview`}
      subtitle={<>Prices in {market.currencyLabel}. Built only from the data you have loaded into this browser.</>}
      actions={<button type="button" className="btn primary" onClick={() => openImport()}>Import price history</button>}
    >
      {hasDemo && (
        <div className="banner warn" role="status">
          <b>Synthetic demo data.</b>Everything shown here comes from fictional companies generated in your browser. These are not real prices. Remove them in Settings or import real data.
        </div>
      )}

      {loadedCount === 0 && !bench ? (
        <div className="panel empty">
          <h2>No market data loaded yet</h2>
          <p>
            EquityLens never invents prices. In this first release you bring your own end-of-day price files (CSV), and they stay in your browser.
            No free, legitimate, browser-accessible live Bursa Malaysia feed was found; <Link to="/data-sources">see why</Link>.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn primary" onClick={() => openImport()}>Import a CSV</button>
            <button type="button" className="btn" onClick={() => void app.loadDemo()}>Explore with synthetic demo data</button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <section aria-label="Market snapshot" className="grid cols-4">
            <div className="panel stat hero">
              <div className="label">{market.benchmarkName}</div>
              {bench ? (
                <>
                  <div className="value">{fmtNumber(bench.last)}</div>
                  <div className={`sub ${signClass(bench.changePct)}`}>{arrow(bench.change)} {fmtNumber(bench.change)} ({fmtPct(bench.changePct)})</div>
                  <div className="sub">as of {bench.asOf} · <QualityBadge quality={bench.series.quality} /></div>
                  <div className="spark-slot"><Sparkline area width={110} height={44} values={bench.series.bars.slice(-60).map((b) => b.c)} /></div>
                </>
              ) : (
                <>
                  <div className="value muted">–</div>
                  <div className="sub">No benchmark loaded. <button type="button" className="btn small" onClick={() => openImport(`${market.id}:KLCI`)}>Import index</button></div>
                </>
              )}
            </div>
            <div className="panel stat">
              <div className="label">Breadth (loaded securities)</div>
              <div className="value"><span className="pos">▲{view.breadth.advancing}</span> <span className="neg">▼{view.breadth.declining}</span> <span className="flat">■{view.breadth.unchanged}</span></div>
              {view.breadth.total > 0 && (
                <div className="breadth" aria-hidden="true">
                  <i className="up" style={{ flex: view.breadth.advancing }} />
                  <i className="eq" style={{ flex: view.breadth.unchanged }} />
                  <i className="down" style={{ flex: view.breadth.declining }} />
                </div>
              )}
              <div className="sub">of {view.breadth.total} comparable on {view.referenceDate ?? '–'}{view.staleRows.length > 0 && ` · ${view.staleRows.length} excluded (older data)`}</div>
            </div>
            <div className="panel stat">
              <div className="label">Market status</div>
              <div className="value" style={{ fontSize: 17 }}>{status.label}</div>
              <div className="sub">{market.shortName} time {status.localTime} · exchange holidays not included</div>
            </div>
            <div className="panel stat">
              <div className="label">Market cap · index volume</div>
              <div className="value muted" style={{ fontSize: 17 }}>Unavailable</div>
              <div className="sub">No verified market-cap source is loaded. {bench?.volume != null ? `Index volume ${fmtCompact(bench.volume)}.` : ''}</div>
            </div>
          </section>

          <section className="panel" aria-label="Market intelligence summary">
            <header><h2>Market intelligence summary</h2></header>
            {insights.length === 0 ? <p className="muted">Not enough loaded data to summarise.</p> : (
              <ul className="plain">
                {insights.map((i) => (
                  <li key={i.text}>{i.text}{' '}<span className="evidence">Evidence: {i.evidence.join(' · ')}</span></li>
                ))}
              </ul>
            )}
            <p className="evidence" style={{ marginTop: 8 }}>
              These statements describe observed price and volume changes in the loaded data. They do not explain why prices moved: no news or confirmed-event data is loaded.
            </p>
          </section>

          <section className="panel" aria-label="Market movers">
            <header><h2>Market movers</h2><span className="muted">{view.rows.length} comparable loaded securities</span></header>
            <div className="chips" role="tablist" aria-label="Mover lists">
              {TABS.map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className="chip" onClick={() => setTab(t.key)}>{t.label}</button>
              ))}
            </div>
            <DataTable
              key={tab} rows={tabRows} columns={cols} rowKey={(r) => r.security.id} caption={tabDef.label}
              initialSort={{ key: tab === 'gainers' || tab === 'losers' ? 'pct' : tab === 'active' ? 'tv' : tab === 'volume' ? 'vol' : tab === 'unusual' ? 'ratio' : 'v20', dir: tabDef.dir }}
              pageSize={10} emptyText="No comparable securities for this list."
            />
          </section>

          <section className="panel" aria-label="Market heatmap">
            <header><h2>Heatmap</h2><span className="muted">Tile size = latest traded value (not market cap)</span></header>
            <Heatmap rows={view.rows} />
            <p className="evidence" style={{ marginTop: 8 }}>
              {advanced ? 'Tile area ∝ close × volume of the latest bar. Colour intensity saturates at ±5% one-day change. Each tile prints the sign and an arrow so direction is never colour-only.'
                : 'Each tile is a company. Bigger tiles traded more value in the latest session. ▲ means the price rose, ▼ means it fell.'}
            </p>
          </section>

          <section className="panel" aria-label="Benchmark tracking">
            <header><h2>Performance versus the benchmark</h2></header>
            {!benchSeries ? <p className="muted">Import the benchmark index ({market.benchmarkName}) to compare stocks against it.</p> : (
              <>
                <DataTable rows={rel} columns={relCols} rowKey={(r) => r.security.id} caption="Relative performance" pageSize={15} filterText={(r) => `${r.security.code} ${r.security.name}`} />
                <p className="evidence" style={{ marginTop: 8 }}>
                  Relative performance = stock return − benchmark return over the same calendar window ending at each series' latest bar. A dash means there is not enough history to compute it without extrapolating. Returns exclude dividends unless prices were adjusted.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}
