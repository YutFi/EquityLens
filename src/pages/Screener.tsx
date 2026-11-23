import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Metrics } from '../analytics/metrics';
import { DataTable, type Column } from '../components/DataTable';
import { Page } from '../components/Layout';
import { fmtPct, fmtPrice, signClass } from '../core/format';
import { useMetrics } from '../state/useMetrics';

interface Filters { pe: string; pb: string; yld: string; roe: string; growth: string; ret3: string; health: string; sector: string; maxVol: string }
const EMPTY: Filters = { pe: '', pb: '', yld: '', roe: '', growth: '', ret3: '', health: '', sector: '', maxVol: '' };
interface Test { label: string; get: (m: Metrics) => number | null; ok: (v: number) => boolean; val: number | null }
const num = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) ? null : Number(s));

export function Screener() {
  const { all } = useMetrics();
  const [f, setF] = useState<Filters>(EMPTY);
  const sectors = useMemo(() => [...new Set(all.map((m) => m.security.sector).filter((x): x is string => !!x))].sort(), [all]);

  const { rows, excluded } = useMemo(() => {
    const candidates: Test[] = [
      { label: 'P/E', get: (m) => m.pe, ok: (v) => v > 0 && v <= (num(f.pe) as number), val: num(f.pe) },
      { label: 'P/B', get: (m) => m.pb, ok: (v) => v > 0 && v <= (num(f.pb) as number), val: num(f.pb) },
      { label: 'Dividend yield', get: (m) => m.dividendYield, ok: (v) => v >= (num(f.yld) as number), val: num(f.yld) },
      { label: 'ROE', get: (m) => m.roe, ok: (v) => v >= (num(f.roe) as number), val: num(f.roe) },
      { label: 'Revenue growth', get: (m) => m.revenueGrowth, ok: (v) => v >= (num(f.growth) as number), val: num(f.growth) },
      { label: '3M return', get: (m) => m.ret3M, ok: (v) => v >= (num(f.ret3) as number), val: num(f.ret3) },
      { label: 'Health score', get: (m) => m.health?.score ?? null, ok: (v) => v >= (num(f.health) as number), val: num(f.health) },
      { label: 'Volatility', get: (m) => m.vol20, ok: (v) => v <= (num(f.maxVol) as number), val: num(f.maxVol) },
    ];
    const tests = candidates.filter((t) => t.val != null);
    let excludedForMissing = 0;
    const out = all.filter((m) => {
      if (f.sector && m.security.sector !== f.sector) return false;
      for (const t of tests) {
        const v = t.get(m);
        if (v == null) { excludedForMissing++; return false; }
        if (!t.ok(v)) return false;
      }
      return true;
    });
    return { rows: out, excluded: excludedForMissing };
  }, [all, f]);

  const set = (k: keyof Filters) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const x = (v: number | null, d = 2, s = '') => (v == null ? '–' : `${v.toFixed(d)}${s}`);
  const cols: Column<Metrics>[] = [
    { key: 'code', label: 'Company', render: (m) => <><Link to={`/company/${encodeURIComponent(m.security.id)}`}><b className="num">{m.security.code}</b></Link> <span className="dim">{m.security.name}</span></>, sort: (m) => m.security.code },
    { key: 'last', label: 'Close', align: 'right', render: (m) => <span className="num">{fmtPrice(m.last, m.security.currency)}</span>, sort: (m) => m.last },
    { key: 'ret3', label: '3M', align: 'right', render: (m) => <span className={`num ${signClass(m.ret3M)}`}>{m.ret3M == null ? '–' : fmtPct(m.ret3M, 1)}</span>, sort: (m) => m.ret3M },
    { key: 'pe', label: 'P/E', align: 'right', render: (m) => <span className="num">{x(m.pe, 1)}</span>, sort: (m) => m.pe },
    { key: 'pb', label: 'P/B', align: 'right', render: (m) => <span className="num">{x(m.pb, 2)}</span>, sort: (m) => m.pb },
    { key: 'yld', label: 'Yield %', align: 'right', render: (m) => <span className="num">{x(m.dividendYield, 2)}</span>, sort: (m) => m.dividendYield },
    { key: 'roe', label: 'ROE %', align: 'right', render: (m) => <span className="num">{x(m.roe, 1)}</span>, sort: (m) => m.roe },
    { key: 'gr', label: 'Rev. growth %', align: 'right', render: (m) => <span className="num">{x(m.revenueGrowth, 1)}</span>, sort: (m) => m.revenueGrowth },
    { key: 'h', label: 'Health', align: 'right', render: (m) => <span className="num">{m.health?.score == null ? '–' : m.health.score.toFixed(0)}</span>, sort: (m) => m.health?.score ?? null },
    { key: 'vol', label: 'Vol. %', align: 'right', render: (m) => <span className="num">{x(m.vol20, 1)}</span>, sort: (m) => m.vol20 },
  ];
  const field = (k: keyof Filters, label: string, ph: string) => <label className="field">{label}<input className="input num" inputMode="decimal" value={f[k]} onChange={set(k)} placeholder={ph} /></label>;

  if (all.length === 0) {
    return (
      <Page title="Stock Screener" subtitle="Filter the companies you have loaded.">
        <div className="panel empty"><h2>No companies with data yet</h2><p>Load price history first. The screener only works on data you have loaded.</p><Link className="btn primary" to="/data-sources">Go to Data Sources</Link></div>
      </Page>
    );
  }

  return (
    <Page title="Stock Screener" subtitle="Filter the companies you have loaded. A filter on a figure excludes companies that do not have it.">
      <div className="stack">
        <section className="panel" aria-label="Filters">
          <div className="grid cols-4">
            {field('pe', 'P/E at most', 'e.g. 15')}{field('pb', 'P/B at most', 'e.g. 1.5')}{field('yld', 'Dividend yield at least (%)', 'e.g. 3')}{field('roe', 'ROE at least (%)', 'e.g. 10')}
            {field('growth', 'Revenue growth at least (%)', 'e.g. 5')}{field('ret3', '3-month return at least (%)', 'e.g. 0')}{field('health', 'Health score at least', 'e.g. 65')}{field('maxVol', '20-day volatility at most (%)', 'e.g. 35')}
            <label className="field">Sector<select className="input" value={f.sector} onChange={set('sector')}><option value="">Any</option>{sectors.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <div className="row" style={{ marginTop: 8 }}><button type="button" className="btn" onClick={() => setF(EMPTY)}>Clear filters</button>
            <span className="muted">{rows.length} of {all.length} loaded companies match{excluded > 0 ? ` · ${excluded} excluded because a filtered figure is missing (not because it failed)` : ''}.</span></div>
        </section>
        <section className="panel" aria-label="Results">
          <DataTable rows={rows} columns={cols} rowKey={(m) => m.security.id} caption="Screener results" initialSort={{ key: 'ret3', dir: 'desc' }} filterText={(m) => `${m.security.code} ${m.security.name}`} emptyText={all.length ? 'No loaded company matches these filters.' : 'Load price history first (Data Sources).'} />
          <p className="evidence">Ratios use the statements you entered and the latest loaded close; a dash means missing, not zero. P/E and P/B filters only accept positive values.</p>
        </section>
      </div>
    </Page>
  );
}
