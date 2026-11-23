import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { summariseSectors } from '../analytics/sectors';
import { Page } from '../components/Layout';
import { fmtCompact, fmtPct, signClass } from '../core/format';
import { useMetrics } from '../state/useMetrics';

const x = (v: number | null, d = 1, s = '') => (v == null ? '–' : `${v.toFixed(d)}${s}`);

export function Sectors() {
  const { all } = useMetrics();
  const rows = useMemo(() => summariseSectors(all), [all]);
  return (
    <Page title="Sector Intelligence" subtitle="Performance, valuation and profitability by sector, for the companies you have loaded.">
      <div className="stack">
        <div className="banner warn"><b>Loaded companies only.</b>These are medians of the {all.length} companies you have loaded, not of the whole sector or market. Sector labels come from the unverified seed directory or your own imports; companies without one appear as Unclassified. With only a few companies per sector, medians can be misleading.</div>
        {rows.length === 0 ? (
          <div className="panel empty"><h2>No companies with data yet</h2><p>Load price history first.</p><Link className="btn primary" to="/data-sources">Go to Data Sources</Link></div>
        ) : (
          <>
            <section className="panel" aria-label="Sector table">
              <div className="table-wrap"><table className="t">
                <caption className="sr-only">Sector medians for loaded companies</caption>
                <thead><tr><th>Sector</th><th className="r">Companies</th><th className="r">1D (median)</th><th className="r">1M</th><th className="r">3M</th><th className="r">6M</th><th className="r">P/E</th><th className="r">P/B</th><th className="r">Yield %</th><th className="r">Volatility %</th><th className="r">Traded value</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.sector}>
                      <td><b>{r.sector}</b></td><td className="r num">{r.count}</td>
                      {[r.medianChange, r.median1M, r.median3M, r.median6M].map((v, i) => <td key={i} className={`r num ${signClass(v)}`}>{v == null ? '–' : fmtPct(v, 1)}</td>)}
                      <td className="r num">{x(r.medianPe)}</td><td className="r num">{x(r.medianPb, 2)}</td><td className="r num">{x(r.medianDividendYield, 2)}</td><td className="r num">{x(r.medianVol)}</td><td className="r num">{fmtCompact(r.tradedValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <p className="evidence">Sorted by median 3-month return. P/E, P/B and yield medians use only companies with statements entered. Traded value is the latest day&apos;s volume × close summed across the sector, a liquidity hint, not market capitalisation.</p>
            </section>
            <div className="grid cols-2">
              {rows.filter((r) => r.leaders.length).map((r) => (
                <section key={r.sector} className="panel" aria-label={`${r.sector} leaders and laggards`}>
                  <header><h2>{r.sector}</h2></header>
                  <dl className="kv">
                    <dt>Leaders (3M)</dt><dd className="num">{r.leaders.map((m) => `${m.security.code} ${fmtPct(m.ret3M, 1)}`).join(' · ')}</dd>
                    <dt>Laggards (3M)</dt><dd className="num">{r.count > 1 ? r.laggards.map((m) => `${m.security.code} ${fmtPct(m.ret3M, 1)}`).join(' · ') : '–'}</dd>
                  </dl>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
