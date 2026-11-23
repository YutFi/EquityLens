import { useMemo, useState } from 'react';
import type { Bar } from '../../core/types';
import { HORIZONS, METHODS, MIN_HISTORY_BARS, runForecast, type HorizonKey } from '../../analytics/forecast';
import { fmtPct, fmtPrice } from '../../core/format';
import { LineChart } from '../LineChart';

const n1 = (v: number | null, d = 1, suffix = '') => (v == null ? '–' : `${v.toFixed(d)}${suffix}`);

/**
 * Transparent statistical forecast. The method is chosen on the first half of the backtest and
 * judged on the second half, so the evidence shown was not used to pick it.
 */
export function ForecastPanel({ bars, currency }: { bars: Bar[]; currency: string }) {
  const [horizon, setHorizon] = useState<HorizonKey>('30D');
  const out = useMemo(() => runForecast(bars, horizon), [bars, horizon]);
  const label = HORIZONS.find((h) => h.key === horizon)?.label ?? horizon;

  return (
    <div className="stack">
      <div className="banner warn"><b>A statistical scenario, not a prediction.</b>It extrapolates past prices with simple methods and ignores news, earnings and shocks. Nobody can reliably forecast a stock price; the point of this page is to show how uncertain the range is and how often these methods failed.</div>
      <div className="seg" role="group" aria-label="Forecast horizon">
        {HORIZONS.map((h) => <button key={h.key} type="button" aria-pressed={horizon === h.key} onClick={() => setHorizon(h.key)}>{h.label}</button>)}
      </div>

      {!out.ok ? (
        <div className="panel empty"><h2>No forecast</h2><p>{out.reason}</p><p className="muted">Minimum history: {MIN_HISTORY_BARS} daily bars.</p></div>
      ) : (
        <>
          <section className="grid cols-4" aria-label="Scenarios">
            <div className="panel stat"><div className="label">Bearish edge ({label})</div><div className="value">{fmtPrice(out.bearish, currency)}</div><div className="sub">{fmtPct(out.bearishPct, 1)} · lower end of the 80% band</div></div>
            <div className="panel stat hero"><div className="label">Base case ({label})</div><div className="value">{fmtPrice(out.base, currency)}</div><div className="sub">{fmtPct(out.basePct, 1)} · {out.methodName}</div></div>
            <div className="panel stat"><div className="label">Bullish edge ({label})</div><div className="value">{fmtPrice(out.bullish, currency)}</div><div className="sub">{fmtPct(out.bullishPct, 1)} · upper end of the 80% band</div></div>
            <div className="panel stat"><div className="label">Evidence from past tests</div><div className="value" style={{ fontSize: 17, textTransform: 'capitalize' }}>{out.reliability === 'no-skill' ? 'No demonstrated skill' : out.reliability === 'insufficient' ? 'Too few tests' : 'Limited'}</div><div className="sub">{out.chosen.n} held-out tests</div></div>
          </section>
          <div className={`banner ${out.reliability === 'limited' ? 'info' : 'warn'}`} role="status"><b>How much to trust it.</b>{out.reliabilityText}</div>

          <section className="panel" aria-label="Forecast chart">
            <header><h2>History and forecast range</h2></header>
            <LineChart
              height={300}
              format={(v) => v.toFixed(3)}
              label={`Closing price history and ${label} forecast with an 80% range from ${out.bearish.toFixed(3)} to ${out.bullish.toFixed(3)}`}
              dividerAt={out.lastDate}
              series={[
                { name: 'Close', points: bars.slice(-180).map((b) => ({ t: b.t, v: b.c })), color: 'var(--text)' },
                { name: 'Forecast (base)', points: [{ t: out.lastDate, v: out.lastClose }, ...out.path.map((p) => ({ t: p.t, v: p.base }))], color: 'var(--accent-2)', dashed: true },
              ]}
              bands={[{ name: '80% range', upper: [{ t: out.lastDate, v: out.lastClose }, ...out.path.map((p) => ({ t: p.t, v: p.upper }))], lower: [{ t: out.lastDate, v: out.lastClose }, ...out.path.map((p) => ({ t: p.t, v: p.lower }))], color: '#8b9cff' }]}
            />
            <p className="evidence">Bands are the base path ± 1.28 × daily volatility × √(days ahead), in log prices. &quot;Bullish&quot; and &quot;bearish&quot; here only mean the edges of that band; they are not separate predictions. Future dates skip weekends only.</p>
          </section>

          <section className="panel" aria-label="Backtest results">
            <header><h2>Backtest: how each method did on held-out history</h2></header>
            <div className="table-wrap">
              <table className="t">
                <caption className="sr-only">Walk-forward backtest metrics at the selected horizon</caption>
                <thead><tr><th>Method</th><th className="r">Tests</th><th className="r">MAE</th><th className="r">RMSE</th><th className="r">MAPE %</th><th className="r">Right direction %</th><th className="r">Inside 80% band %</th><th className="r">Skill vs naive</th></tr></thead>
                <tbody>
                  {out.table.map((m) => (
                    <tr key={m.method} style={m.method === out.method ? { background: 'var(--panel-2)' } : undefined}>
                      <td>{METHODS.find((x) => x.id === m.method)?.name}{m.method === out.method ? ' (selected)' : ''}</td>
                      <td className="r num">{m.n}</td><td className="r num">{n1(m.mae, 3)}</td><td className="r num">{n1(m.rmse, 3)}</td><td className="r num">{n1(m.mape, 2)}</td>
                      <td className="r num">{n1(m.directional, 0)}</td><td className="r num">{n1(m.coverage, 0)}</td><td className="r num">{m.skill == null ? '–' : `${(m.skill * 100).toFixed(0)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="evidence">
              Walk-forward test: at each past date, the method sees only earlier prices, forecasts {label} ahead, and is compared with what happened. The method is selected on the first half of those tests and judged on the second half. MAE = average absolute error; RMSE penalises large misses; MAPE = error as % of the outcome; Skill = 1 − MAE ÷ MAE of the naive baseline (positive = better than assuming no change). Directional accuracy is blank for methods that never forecast a change. {out.warnings.join(' ')}
            </p>
          </section>

          <section className="panel" aria-label="Recent forecasts versus actual">
            <header><h2>Recent test forecasts versus what happened</h2></header>
            <div className="table-wrap">
              <table className="t">
                <caption className="sr-only">Most recent held-out forecasts and actual prices</caption>
                <thead><tr><th>Forecast made on</th><th className="r">Price then</th><th className="r">Forecast</th><th className="r">Actual</th><th className="r">Error %</th><th>Inside band?</th></tr></thead>
                <tbody>
                  {out.recent.map((p) => (
                    <tr key={p.originDate}>
                      <td className="num">{p.originDate}</td><td className="r num">{p.lastKnown.toFixed(3)}</td><td className="r num">{p.forecast.toFixed(3)}</td><td className="r num">{p.actual.toFixed(3)}</td>
                      <td className="r num">{(((p.forecast - p.actual) / p.actual) * 100).toFixed(1)}</td><td>{p.actual >= p.lower && p.actual <= p.upper ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <details className="panel"><summary>The methods used (ARIMA is deliberately not included)</summary>
            <ul className="plain">{METHODS.map((m) => <li key={m.id}><b>{m.name}.</b> {m.plain}</li>)}</ul>
            <p className="evidence">All methods work on log prices. ARIMA is not implemented: a dependable fit needs a numerical optimiser and diagnostics that were not built or tested here, and on daily prices it would rarely beat the baseline.</p>
          </details>
        </>
      )}
    </div>
  );
}
