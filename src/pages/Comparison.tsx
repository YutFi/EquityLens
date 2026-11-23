import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Metrics } from '../analytics/metrics';
import { LineChart } from '../components/LineChart';
import { Page } from '../components/Layout';
import { fmtPct, signClass } from '../core/format';
import { addDays } from '../core/dates';
import { useMetrics } from '../state/useMetrics';

const WINDOWS = [{ key: '3M', days: 91 }, { key: '6M', days: 182 }, { key: '1Y', days: 365 }, { key: 'All', days: 0 }];
const COLORS = ['#5eead4', '#8b9cff', '#fbbf24', '#fb7185', '#7dd3fc'];
const x = (v: number | null, d = 1, s = '') => (v == null ? '–' : `${v.toFixed(d)}${s}`);

export function Comparison() {
  const { all } = useMetrics();
  const [ids, setIds] = useState<string[]>([]);
  const [win, setWin] = useState(WINDOWS[1]);
  const chosen = useMemo(() => ids.map((id) => all.find((m) => m.security.id === id)).filter((m): m is Metrics => !!m), [ids, all]);

  const chart = useMemo(() => {
    if (chosen.length < 2) return null;
    const latestStart = chosen.reduce((a, m) => (m.series.bars[0].t > a ? m.series.bars[0].t : a), '0000');
    const end = chosen.reduce((a, m) => (m.asOf < a ? m.asOf : a), '9999');
    const wanted = win.days ? addDays(end, -win.days) : latestStart;
    const start = wanted > latestStart ? wanted : latestStart;
    const series = chosen.map((m, i) => {
      const bars = m.series.bars.filter((b) => b.t >= start && b.t <= end);
      const base = bars[0]?.c;
      return { name: m.security.code, color: COLORS[i % COLORS.length], points: base ? bars.map((b) => ({ t: b.t, v: (b.c / base) * 100 })) : [] };
    });
    return { series, start, end, clipped: wanted < latestStart };
  }, [chosen, win]);

  const toggle = (id: string) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 5 ? cur : [...cur, id]));

  return (
    <Page title="Comparison" subtitle="Compare up to five loaded companies on performance, risk, valuation and financial health.">
      <div className="stack">
        {all.length === 0 ? (
          <div className="panel empty"><h2>No companies with data yet</h2><p>Load price history first.</p><Link className="btn primary" to="/data-sources">Go to Data Sources</Link></div>
        ) : (
          <>
            <section className="panel" aria-label="Choose companies">
              <header><h2>Choose 2 to 5 companies</h2><span className="muted">{ids.length}/5 selected</span></header>
              <div className="chips">
                {all.map((m) => <button key={m.security.id} type="button" className="chip" aria-selected={ids.includes(m.security.id)} aria-pressed={ids.includes(m.security.id)} onClick={() => toggle(m.security.id)}>{m.security.code}</button>)}
              </div>
            </section>
            {chosen.length < 2 ? <div className="panel empty"><h2>Pick at least two companies</h2></div> : (
              <>
                <section className="panel" aria-label="Relative performance">
                  <header><h2>Performance, rebased to 100</h2>
                    <div className="seg" role="group" aria-label="Window">{WINDOWS.map((w) => <button key={w.key} type="button" aria-pressed={win.key === w.key} onClick={() => setWin(w)}>{w.key}</button>)}</div></header>
                  {chart && chart.series.every((s) => s.points.length > 1)
                    ? <LineChart series={chart.series} height={300} refLine={100} format={(v) => v.toFixed(1)} label={`Price performance rebased to 100 from ${chart.start} to ${chart.end}`} />
                    : <p className="muted">The selected companies do not share enough overlapping history for this window.</p>}
                  {chart && <p className="evidence">All lines start at 100 on {chart.start}{chart.clipped ? ' (the latest first-date among the chosen companies; the window was shortened to the data they share)' : ''} and end {chart.end}. Prices are as loaded (not adjusted unless your files were).</p>}
                </section>
                <section className="panel" aria-label="Metrics">
                  <div className="table-wrap"><table className="t">
                    <caption className="sr-only">Side-by-side metrics</caption>
                    <thead><tr><th>Metric</th>{chosen.map((m) => <th key={m.security.id} className="r">{m.security.code}</th>)}</tr></thead>
                    <tbody>
                      {([
                        ['Sector', (m) => m.security.sector ?? '–', false],
                        ['Latest close', (m) => m.last.toFixed(3), false],
                        ['1M return', (m) => (m.ret1M == null ? '–' : fmtPct(m.ret1M, 1)), true, (m) => m.ret1M],
                        ['3M return', (m) => (m.ret3M == null ? '–' : fmtPct(m.ret3M, 1)), true, (m) => m.ret3M],
                        ['1Y return', (m) => (m.ret1Y == null ? '–' : fmtPct(m.ret1Y, 1)), true, (m) => m.ret1Y],
                        ['20-day volatility %', (m) => x(m.vol20), false],
                        ['Worst fall from peak %', (m) => x(m.maxDD), false],
                        ['RSI (14)', (m) => x(m.rsi14), false],
                        ['P/E', (m) => x(m.pe), false],
                        ['P/B', (m) => x(m.pb, 2), false],
                        ['Dividend yield %', (m) => x(m.dividendYield, 2), false],
                        ['ROE %', (m) => x(m.roe), false],
                        ['Revenue growth %', (m) => x(m.revenueGrowth), false],
                        ['Health score', (m) => (m.health?.score == null ? '–' : `${m.health.score.toFixed(0)} (${m.health.classification})`), false],
                      ] as [string, (m: Metrics) => string, boolean, ((m: Metrics) => number | null)?][]).map(([label, fn, signed, raw]) => (
                        <tr key={label}><td>{label}</td>{chosen.map((m) => <td key={m.security.id} className={`r num ${signed && raw ? signClass(raw(m)) : ''}`}>{fn(m)}</td>)}</tr>
                      ))}
                    </tbody>
                  </table></div>
                  <p className="evidence">A dash means the figure is not available from the data loaded (no statements entered, or too little history). Companies in different sectors are not directly comparable on P/E or P/B.</p>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </Page>
  );
}
