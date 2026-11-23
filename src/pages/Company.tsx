import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { describePriceHistory } from '../analytics/describe';
import { annualisedVolatility, maxDrawdown, pctChange, periodReturn, PERIODS } from '../analytics/returns';
import { Page, useImportDialog } from '../components/Layout';
import { PriceChart } from '../components/PriceChart';
import { QualityBadge, QualityPanel } from '../components/QualityBadge';
import { Sparkline } from '../components/Sparkline';
import { arrow, fmtCompact, fmtNumber, fmtPct, fmtPrice, signClass } from '../core/format';
import { MARKETS } from '../core/markets';
import type { IntervalKey, RangeKey } from '../core/types';
import { addDays } from '../core/dates';
import { aggregateBars, applyAdjustment, sliceRange } from '../data/aggregate';
import { useApp } from '../state/AppContext';
import { useMetrics } from '../state/useMetrics';
import { marketCap } from '../analytics/ratios';
import { peerMultiples } from '../analytics/metrics';
import { buildEodhdSeries, fetchEodhdHistory, loadEodhdKey } from '../data/providers/eodhd';
import { FundamentalsDialog } from '../components/FundamentalsDialog';
import { FinancialsPanel } from '../components/research/FinancialsPanel';
import { ForecastPanel } from '../components/research/ForecastPanel';
import { RiskPanel } from '../components/research/RiskPanel';
import { TechnicalsPanel } from '../components/research/TechnicalsPanel';
import { ValuationPanel } from '../components/research/ValuationPanel';

const RANGES: RangeKey[] = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'];
const INTERVALS: { key: IntervalKey; label: string }[] = [{ key: 'daily', label: 'Daily' }, { key: 'weekly', label: 'Weekly' }, { key: 'monthly', label: 'Monthly' }];
const UNAVAILABLE = <span className="muted">Unavailable (no verified source; never guessed)</span>;

type Tab = 'overview' | 'technicals' | 'financials' | 'valuation' | 'forecast' | 'risk';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' }, { key: 'technicals', label: 'Price & technicals' }, { key: 'financials', label: 'Financials & health' },
  { key: 'valuation', label: 'Valuation' }, { key: 'forecast', label: 'Forecast' }, { key: 'risk', label: 'Risk' },
];

export function CompanyIndex() {
  const app = useApp();
  const { openImport } = useImportDialog();
  const loaded = app.securities.filter((s) => s.market === app.state.settings.market && app.state.seriesById[s.id]);
  return (
    <Page title="Company Research" subtitle="Pick a company with loaded data, or search from the header." actions={<button className="btn primary" type="button" onClick={() => openImport()}>Import price history</button>}>
      {loaded.length === 0 ? (
        <div className="panel empty"><h2>No companies have data yet</h2><p>Import a CSV, or browse the <Link to="/discover">directory</Link>.</p></div>
      ) : (
        <div className="grid cols-4">
          {loaded.map((s) => (
            <Link key={s.id} to={`/company/${encodeURIComponent(s.id)}`} className="panel" style={{ color: 'inherit' }}>
              <b className="num">{s.code}</b><div className="dim">{s.name}</div>
              <div style={{ marginTop: 6 }}><QualityBadge quality={app.state.seriesById[s.id].quality} /></div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}

export function CompanyPage() {
  const { id = '' } = useParams();
  const app = useApp();
  const { openImport } = useImportDialog();
  const [range, setRange] = useState<RangeKey>('1Y');
  const [interval, setInterval] = useState<IntervalKey>('daily');
  const [adjusted, setAdjusted] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [editFin, setEditFin] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const metrics = useMetrics();

  const sec = app.securities.find((s) => s.id === id);
  const series = app.state.seriesById[id];
  const advanced = app.state.settings.level === 'advanced';
  const market = sec ? MARKETS[sec.market] : MARKETS[app.state.settings.market];

  const base = useMemo(() => (!series ? [] : adjusted && series.adjustedAvailable ? applyAdjustment(series.bars) : series.bars), [series, adjusted]);
  const bars = useMemo(() => aggregateBars(sliceRange(base, range), interval), [base, range, interval]);

  if (!sec) {
    return <Page title="Company not found"><div className="panel empty"><h2>No security with id “{id}”</h2><p><Link to="/discover">Browse the directory</Link></p></div></Page>;
  }

  async function fetchEodhd() {
    if (!sec) return;
    setFetching(true); setFetchMsg(null);
    const from = addDays(new Date().toISOString().slice(0, 10), -365);
    const r = await fetchEodhdHistory(sec, loadEodhdKey(), { from });
    if (!r.ok) setFetchMsg(r.message);
    else {
      await app.importSeries({ ...sec, origin: sec.origin === 'seed' ? 'import' : sec.origin }, buildEodhdSeries(sec, r.bars, r.rejected));
      setFetchMsg(`Loaded ${r.bars.length} daily bars from EODHD${r.rejected ? ` (${r.rejected} rows rejected)` : ''}. Not independently verified.`);
    }
    setFetching(false);
  }
  const all = series?.bars ?? [];
  const fundamentals = app.state.fundamentalsById[sec.id] ?? null;
  const benchBars = metrics.benchmark && metrics.benchmark.security.id !== sec.id ? metrics.benchmark.series.bars : null;
  const peers = peerMultiples(metrics.all, sec);
  const last = all.at(-1);
  const prev = all.length > 1 ? all[all.length - 2] : null;
  const change = last && prev ? last.c - prev.c : null;
  const changePct = last && prev ? pctChange(prev.c, last.c) : null;
  const yearBars = sliceRange(all, '1Y');
  const hasFullYear = all.length > 0 && all[0].t <= addDays(all[all.length - 1].t, -365);
  const hi = yearBars.length ? Math.max(...yearBars.map((b) => b.h)) : null;
  const lo = yearBars.length ? Math.min(...yearBars.map((b) => b.l)) : null;
  const vol20 = annualisedVolatility(all, 20);
  const dd = maxDrawdown(all);

  return (
    <Page
      title={`${sec.name}`}
      subtitle={<><span className="num">{sec.code}</span> · {market.name} · {sec.currency} {series && <QualityBadge quality={series.quality} />}</>}
      actions={
        <>
          {sec.market === 'XKLS' && sec.kind === 'equity' && loadEodhdKey() !== '' && <button type="button" className="btn" disabled={fetching} onClick={() => void fetchEodhd()}>{fetching ? 'Fetching…' : 'Fetch from EODHD (experimental)'}</button>}
          <button type="button" className="btn" onClick={() => openImport(sec.id)}>{series ? 'Replace price history' : 'Import price history'}</button>
          {series && (confirmRemove
            ? <button type="button" className="btn danger" onClick={() => { void app.removeData(sec.id); setConfirmRemove(false); }}>Confirm: remove local data</button>
            : <button type="button" className="btn" onClick={() => setConfirmRemove(true)}>Remove data</button>)}
        </>
      }
    >
      {fetchMsg && <div className="banner info" role="status" style={{ marginBottom: 12 }}>{fetchMsg}</div>}
      {!series ? (
        <div className="panel empty">
          <h2>No price data loaded for this security</h2>
          <p>EquityLens shows nothing rather than inventing prices. Import an end-of-day CSV to chart {sec.code}.</p>
          <button type="button" className="btn primary" onClick={() => openImport(sec.id)}>Import price history</button>
        </div>
      ) : (
        <div className="stack">
          {series.quality.status === 'demo' && <div className="banner warn"><b>Synthetic demo data.</b>This is a fictional company with generated prices.</div>}
          {(series.quality.status === 'stale' || series.quality.status === 'incomplete') && (
            <div className="banner warn" role="status"><b>{series.quality.status === 'stale' ? 'Stale data.' : 'Incomplete data.'}</b>{series.quality.notes.join(' ')}</div>
          )}

          <div className="tabs" role="tablist" aria-label="Research sections">
            {TABS.map((t) => <button key={t.key} type="button" role="tab" className="chip" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>)}
          </div>
          {tab === 'technicals' && <TechnicalsPanel bars={all} currency={sec.currency} />}
          {tab === 'financials' && <FinancialsPanel fundamentals={fundamentals} price={last?.c ?? null} onEdit={() => setEditFin(true)} />}
          {tab === 'valuation' && <ValuationPanel fundamentals={fundamentals} price={last?.c ?? null} bars={all} peers={peers} currency={sec.currency} onEdit={() => setEditFin(true)} />}
          {tab === 'forecast' && <ForecastPanel bars={all} currency={sec.currency} />}
          {tab === 'risk' && <RiskPanel bars={all} bench={benchBars} fundamentals={fundamentals} price={last?.c ?? null} onEdit={() => setEditFin(true)} />}

          {tab === 'overview' && (<>
          <section className="grid cols-4" aria-label="Price summary">
            <div className="panel stat hero">
              <div className="label">Latest close</div>
              <div className="value">{fmtPrice(last?.c, sec.currency)}</div>
              <div className={`sub ${signClass(change)}`}>{arrow(change)} {fmtNumber(change, 3)} ({fmtPct(changePct)}) · {last?.t}</div>
              <div className="spark-slot"><Sparkline area width={110} height={44} values={all.slice(-60).map((b) => b.c)} /></div>
            </div>
            <div className="panel stat">
              <div className="label">{hasFullYear ? '52-week' : 'Loaded-range'} high / low</div>
              <div className="value" style={{ fontSize: 17 }}>{fmtPrice(hi, sec.currency)} / {fmtPrice(lo, sec.currency)}</div>
              <div className="sub">{hasFullYear ? 'Last 12 months of loaded data' : 'Less than 12 months loaded, so not a true 52-week range'}</div>
            </div>
            <div className="panel stat">
              <div className="label">Volume (latest)</div>
              <div className="value" style={{ fontSize: 17 }}>{fmtCompact(last?.v)}</div>
              <div className="sub">{last?.v == null ? 'No volume in the source file' : 'Shares traded'}</div>
            </div>
            <div className="panel stat">
              <div className="label">Market cap</div>
              {(() => { const mc = fundamentals && last ? marketCap(fundamentals, last.c) : null; return mc != null
                ? <><div className="value" style={{ fontSize: 17 }}>{fmtCompact(mc)}</div><div className="sub">Latest close × shares you entered</div></>
                : <><div className="value muted" style={{ fontSize: 17 }}>Unavailable</div><div className="sub">Enter shares outstanding under Financials</div></>; })()}
            </div>
          </section>

          <section className="panel" aria-label="Price chart">
            <header>
              <div className="row">
                <div className="seg" role="group" aria-label="Range">
                  {RANGES.map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}
                </div>
                <div className="seg" role="group" aria-label="Interval">
                  {INTERVALS.map((i) => <button key={i.key} type="button" aria-pressed={interval === i.key} onClick={() => setInterval(i.key)}>{i.label}</button>)}
                </div>
              </div>
              <label className="row" title={series.adjustedAvailable ? '' : 'Your file has no adjusted close for every row'}>
                <input type="checkbox" checked={adjusted && series.adjustedAvailable} disabled={!series.adjustedAvailable} onChange={(e) => setAdjusted(e.target.checked)} />
                <span className="dim">Use adjusted prices</span>
              </label>
            </header>
            <PriceChart bars={bars} currency={sec.currency} showVolume={all.some((b) => b.v != null)} label={`${sec.name} price history`} />
            <p className="evidence" style={{ marginTop: 6 }}>
              Prices are exactly as supplied in the imported file.{' '}
              {series.adjustedAvailable
                ? adjusted ? 'Adjusted prices are rescaled using the adjusted close column in your file.' : 'Your file includes an adjusted close; tick the box to chart dividend/split-adjusted prices.'
                : 'Your file has no adjusted close, so splits, bonus issues and dividends are not reflected. Treat long-horizon returns with caution.'}{' '}
              Weekly and monthly bars are built from daily bars and dated on their last trading day.
            </p>
          </section>

          <section className="panel" aria-label="What the data shows">
            <header><h2>{advanced ? 'Descriptive statistics' : 'What the price history shows'}</h2></header>
            {!advanced ? (
              <ul className="plain">{describePriceHistory(all, sec.currency).map((l) => <li key={l}>{l}</li>)}</ul>
            ) : (
              <div className="table-wrap">
                <table className="t">
                  <caption className="sr-only">Returns and risk statistics</caption>
                  <thead><tr>{PERIODS.map((p) => <th key={p.key} className="r">{p.key} return</th>)}<th className="r">20d vol (ann.)</th><th className="r">Max drawdown</th><th className="r">Bars</th></tr></thead>
                  <tbody><tr>
                    {PERIODS.map((p) => { const v = periodReturn(all, p.days); return <td key={p.key} className={`r num ${signClass(v)}`}>{v == null ? '–' : fmtPct(v)}</td>; })}
                    <td className="r num">{vol20 == null ? '–' : `${vol20.toFixed(2)}%`}</td>
                    <td className="r num">{dd == null ? '–' : `${dd.toFixed(2)}%`}</td>
                    <td className="r num">{all.length}</td>
                  </tr></tbody>
                </table>
              </div>
            )}
            {advanced && (
              <p className="evidence" style={{ marginTop: 8 }}>
                Return = (Close<sub>end</sub> − Close<sub>start</sub>) / Close<sub>start</sub>, using the last close on or before the window start; a dash means the history is shorter than the window. Volatility = stdev of ln(C<sub>t</sub>/C<sub>t−1</sub>) over 20 bars × √252. Max drawdown = worst peak-to-trough close over the loaded range.
              </p>
            )}
          </section>

          <div className="grid cols-2">
            <section className="panel" aria-label="Company profile">
              <header><h2>Profile</h2></header>
              <dl className="kv">
                <dt>Code</dt><dd className="num">{sec.code}</dd>
                <dt>Exchange</dt><dd>{market.name}</dd>
                <dt>Type</dt><dd>{sec.kind === 'index' ? 'Index' : 'Company'}</dd>
                <dt>Sector</dt><dd>{sec.sector ?? <span className="muted">Not recorded (never guessed)</span>}</dd>
                <dt>Industry</dt><dd>{UNAVAILABLE}</dd>
                <dt>Description</dt><dd>{UNAVAILABLE}</dd>
                <dt>Shares outstanding</dt><dd>{fundamentals?.sharesOutstanding ? <span className="num">{fundamentals.sharesOutstanding.toLocaleString()} <span className="muted">(entered by you)</span></span> : UNAVAILABLE}</dd>
                <dt>Headquarters / website</dt><dd>{UNAVAILABLE}</dd>
                <dt>Directory entry</dt><dd>{sec.origin === 'seed' ? 'Seed directory (unverified)' : sec.origin === 'demo' ? 'Synthetic demo' : 'Added by you'}</dd>
              </dl>
            </section>
            <section className="panel" aria-label="Data quality">
              <header><h2>Data quality</h2></header>
              <QualityPanel quality={series.quality} />
            </section>
          </div>

          <section className="panel" aria-label="Fundamentals">
            <header><h2>Financial statements, ratios and health score</h2><span className={`badge ${fundamentals ? 'estimated' : 'unavailable'}`}>{fundamentals ? 'Entered by you' : 'No statements loaded'}</span></header>
            <p className="muted">{fundamentals
              ? 'Statements, ratios, the health score, valuation and risk tools are built from the figures you entered. Open the Financials & health tab to see them.'
              : 'There is no free licensed feed of Bursa company statements. Enter or import figures from the company\'s published report to unlock ratios, the health score, valuation and the opportunity scanner. Nothing is estimated in the meantime.'}</p>
            <div className="row"><button type="button" className="btn" onClick={() => setTab('financials')}>Open Financials & health</button><button type="button" className="btn primary" onClick={() => setEditFin(true)}>{fundamentals ? 'Add or replace figures' : 'Enter or import financials'}</button></div>
          </section>

          {advanced && (
            <section className="panel" aria-label="Recent bars">
              <header><h2>Most recent bars (as imported)</h2></header>
              <div className="table-wrap">
                <table className="t">
                  <caption className="sr-only">Last 15 daily bars</caption>
                  <thead><tr><th>Date</th><th className="r">Open</th><th className="r">High</th><th className="r">Low</th><th className="r">Close</th><th className="r">Volume</th><th className="r">Adj close</th></tr></thead>
                  <tbody>
                    {all.slice(-15).reverse().map((b) => (
                      <tr key={b.t}><td className="num">{b.t}</td><td className="r num">{b.o}</td><td className="r num">{b.h}</td><td className="r num">{b.l}</td><td className="r num">{b.c}</td><td className="r num">{b.v ?? '–'}</td><td className="r num">{b.adj ?? '–'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          </>)}
          {editFin && <FundamentalsDialog security={sec} onClose={() => setEditFin(false)} />}
        </div>
      )}
    </Page>
  );
}
