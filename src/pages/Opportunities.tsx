import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { scoreOpportunity, type CategoryId, type Opportunity } from '../analytics/opportunities';
import { Page } from '../components/Layout';
import { fmtPct } from '../core/format';
import { useMetrics } from '../state/useMetrics';

const CATS: { id: CategoryId | 'all'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'undervalued', label: 'Undervalued' }, { id: 'growth', label: 'Growth' }, { id: 'dividend', label: 'Dividend' },
  { id: 'momentum', label: 'Momentum' }, { id: 'recovery', label: 'Recovery' }, { id: 'warning', label: 'Warning signals' },
];
const MARK = { met: '✓ met', 'not-met': '✗ not met', 'no-data': '– no data' } as const;

export function Opportunities() {
  const { all } = useMetrics();
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const opps = useMemo(() => all.map((m) => scoreOpportunity(m, all)), [all]);
  const shown = useMemo(() => {
    const list = cat === 'all' ? opps : opps.filter((o) => o.categories.find((c) => c.id === cat)?.flagged);
    return [...list].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [opps, cat]);
  const withStatements = all.filter((m) => m.fundamentals).length;

  return (
    <Page title="Opportunities" subtitle="A research-priority scanner. It ranks which companies deserve a closer look, using fixed rules you can read.">
      <div className="stack">
        <div className="banner warn"><b>Not buy or sell signals.</b>A high score does not predict returns. Cheap is not the same as undervalued, and momentum is not the same as quality. The scanner only covers the {all.length} companies you have loaded ({withStatements} with statements), so it is a shortlist of your own data, not of the market.</div>
        {all.length === 0 ? (
          <div className="panel empty"><h2>No companies with data yet</h2><p>Load price history (and company financials) first.</p><Link className="btn primary" to="/data-sources">Go to Data Sources</Link></div>
        ) : (
          <>
            <div className="tabs" role="tablist" aria-label="Category">
              {CATS.map((c) => <button key={c.id} type="button" role="tab" className="chip" aria-selected={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>)}
            </div>
            <section className="panel" aria-label="Scanner results">
              <div className="table-wrap">
                <table className="t">
                  <caption className="sr-only">Companies ranked by research priority</caption>
                  <thead><tr><th>Company</th><th className="r">Priority score</th><th className="r">Data coverage</th><th>Categories met</th><th /></tr></thead>
                  <tbody>
                    {shown.length === 0 && <tr><td colSpan={5} className="muted">No loaded company meets every evaluable criterion in this category. Missing data is never counted as a pass.</td></tr>}
                    {shown.map((o) => <Row key={o.metrics.security.id} o={o} open={open === o.metrics.security.id} toggle={() => setOpen(open === o.metrics.security.id ? null : o.metrics.security.id)} />)}
                  </tbody>
                </table>
              </div>
              <p className="evidence">Score = weighted mix of financial health 25, valuation vs same-sector peers 20, growth 15, dividend quality 10, price momentum 15, price risk 15. Components without data are left out and the rest re-weighted; with under 40% coverage no score is shown. A category needs every evaluable criterion met (and at least two evaluable); warning signals apply if any one is met.</p>
            </section>
          </>
        )}
      </div>
    </Page>
  );
}

function Row({ o, open, toggle }: { o: Opportunity; open: boolean; toggle: () => void }) {
  const m = o.metrics;
  const flagged = o.categories.filter((c) => c.flagged);
  return (
    <>
      <tr>
        <td><Link to={`/company/${encodeURIComponent(m.security.id)}`}><b className="num">{m.security.code}</b></Link> <span className="dim">{m.security.name}</span></td>
        <td className="r num">{o.score == null ? <span className="muted">Insufficient data</span> : o.score.toFixed(0)}</td>
        <td className="r num">{o.coverage.toFixed(0)}%</td>
        <td>{flagged.length ? flagged.map((c) => <span key={c.id} className={`badge ${c.id === 'warning' ? 'incomplete' : 'historical'}`} style={{ marginRight: 4 }}>{c.label.split(' (')[0]}</span>) : <span className="muted">None</span>}</td>
        <td><button type="button" className="btn" aria-expanded={open} onClick={toggle}>{open ? 'Hide' : 'Why'}</button></td>
      </tr>
      {open && (
        <tr><td colSpan={5}>
          <div className="grid cols-2">
            <div>
              <b>Score components</b>
              <ul className="plain">{o.components.map((c) => <li key={c.key}><b>{c.label}</b> (weight {c.weight}): <span className="num">{c.score == null ? 'no data' : c.score.toFixed(0)}</span>. <span className="dim">{c.explanation}</span></li>)}</ul>
            </div>
            <div>
              <b>Category checks</b>
              {o.categories.map((c) => (
                <details key={c.id}><summary>{c.label}: {c.flagged ? 'applies' : 'does not apply'} ({c.met}/{c.evaluable} evaluable met)</summary>
                  <ul className="plain">{c.criteria.map((k) => <li key={k.text}>{MARK[k.status]} · {k.text} <span className="muted">({k.evidence})</span></li>)}</ul>
                </details>
              ))}
              <p className="muted num">Latest close {m.last.toFixed(3)} on {m.asOf}; 3-month return {m.ret3M == null ? '–' : fmtPct(m.ret3M, 1)}.</p>
            </div>
          </div>
        </td></tr>
      )}
    </>
  );
}
