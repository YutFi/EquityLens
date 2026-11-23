import { useMemo, useState } from 'react';
import type { Bar } from '../../core/types';
import type { Fundamentals } from '../../core/fundamentals';
import { earningsScenario, priceRisk, priceShock, stabilityMetrics, type ScenarioInput } from '../../analytics/risk';
import { fmtPct } from '../../core/format';

const n = (v: number | null, d = 2, s = '') => (v == null ? '–' : `${v.toFixed(d)}${s}`);

/** Price risk, fundamental stability and what-if sliders. The sliders are hypothetical arithmetic, not forecasts. */
export function RiskPanel({ bars, bench, fundamentals, price, onEdit }: { bars: Bar[]; bench: Bar[] | null; fundamentals: Fundamentals | null; price: number | null; onEdit: () => void }) {
  const risk = useMemo(() => priceRisk(bars, bench), [bars, bench]);
  const stab = useMemo(() => (fundamentals ? stabilityMetrics(fundamentals) : []), [fundamentals]);
  const [s, setS] = useState<ScenarioInput>({ revenueShockPct: -10, fixedCostSharePct: 50, marginShockPp: 0, rateShockPp: 1, floatingDebtSharePct: 50, taxRatePct: 24 });
  const [shock, setShock] = useState(-20);
  const scenario = useMemo(() => (fundamentals ? earningsScenario(fundamentals, price, s) : null), [fundamentals, price, s]);
  const slider = (k: keyof ScenarioInput, label: string, min: number, max: number, step = 1, unit = '') => (
    <label className="field">{label}: <b className="num">{s[k]}{unit}</b>
      <input type="range" min={min} max={max} step={step} value={s[k]} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} />
    </label>
  );
  const sh = priceShock(price ?? 0, shock);

  return (
    <div className="stack">
      <section className="panel" aria-label="Price risk">
        <header><h2>Price risk (from loaded prices)</h2></header>
        <dl className="kv">
          <dt>Volatility, 20-day / 60-day (annualised)</dt><dd className="num">{n(risk.vol20, 1, '%')} / {n(risk.vol60, 1, '%')}</dd>
          <dt>Worst fall from a peak (loaded range)</dt><dd className="num">{n(risk.maxDrawdown, 1, '%')}</dd>
          <dt>1-day 95% value at risk</dt><dd className="num">{n(risk.var95, 2, '%')} <span className="muted">(a loss this large or worse happened on about 1 in 20 past days)</span></dd>
          <dt>Downside deviation (annualised)</dt><dd className="num">{n(risk.downsideDeviation, 1, '%')}</dd>
          <dt>Beta vs benchmark</dt><dd className="num">{risk.beta == null ? '–' : risk.beta.toFixed(2)} <span className="muted">{risk.beta == null ? '(needs the benchmark index loaded with at least 60 overlapping days)' : `(${risk.betaObservations} overlapping days)`}</span></dd>
        </dl>
        <p className="evidence">Historical measures. They describe what happened, and risk can be higher in the future than in any sample.</p>
      </section>

      <section className="panel" aria-label="Fundamental stability">
        <header><h2>Fundamental stability</h2></header>
        {!fundamentals ? <p className="muted">Needs company financials. <button type="button" className="btn" onClick={onEdit}>Enter or import</button></p> : (
          <div className="table-wrap"><table className="t"><caption className="sr-only">Stability measures</caption><thead><tr><th>Measure</th><th>Value</th><th>How it is measured</th></tr></thead>
            <tbody>{stab.map((x) => <tr key={x.label}><td>{x.label}</td><td className="num">{x.value}</td><td className="dim">{x.note}</td></tr>)}</tbody></table></div>
        )}
      </section>

      <section className="panel" aria-label="What-if scenario">
        <header><h2>What-if: earnings sensitivity</h2></header>
        <p className="muted">A hypothetical, not a forecast. It applies your shocks to the latest annual figures and shows the arithmetic.</p>
        {!fundamentals ? <p className="muted">Needs company financials.</p> : (
          <>
            <div className="grid cols-4">
              {slider('revenueShockPct', 'Revenue change', -50, 30, 1, '%')}
              {slider('fixedCostSharePct', 'Share of costs that are fixed', 0, 100, 5, '%')}
              {slider('marginShockPp', 'Margin change', -10, 10, 0.5, ' pp')}
              {slider('rateShockPp', 'Interest-rate rise', 0, 5, 0.25, ' pp')}
              {slider('floatingDebtSharePct', 'Share of debt at floating rates', 0, 100, 5, '%')}
              {slider('taxRatePct', 'Tax rate', 0, 40, 1, '%')}
            </div>
            {scenario && 'error' in scenario ? <div className="banner warn" role="status">{scenario.error}</div> : scenario && (
              <div className="stack" style={{ marginTop: 10 }}>
                <dl className="kv">
                  <dt>Net income</dt><dd className="num">{Math.round(scenario.baseNetIncome).toLocaleString()} → {Math.round(scenario.shockedNetIncome).toLocaleString()} ({scenario.netIncomeChangePct == null ? '–' : fmtPct(scenario.netIncomeChangePct, 1)})</dd>
                  <dt>EPS</dt><dd className="num">{n(scenario.baseEps, 3)} → {n(scenario.shockedEps, 3)}</dd>
                  <dt>P/E at today&apos;s price on shocked EPS</dt><dd className="num">{n(scenario.impliedPe, 1, 'x')}</dd>
                </dl>
                <ol className="plain">{scenario.steps.map((x) => <li key={x}>{x}</li>)}</ol>
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel" aria-label="Price shock">
        <header><h2>What-if: price shock on a holding</h2></header>
        <label className="field" style={{ maxWidth: 360 }}>Price change: <b className="num">{shock}%</b>
          <input type="range" min={-60} max={40} step={1} value={shock} onChange={(e) => setShock(Number(e.target.value))} />
        </label>
        <p className="num">{price == null ? 'No price loaded.' : `From ${price.toFixed(3)} to ${sh.newValue.toFixed(3)} per share. A 10,000-share holding would change by ${(sh.change * 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })} in value.`}</p>
        <p className="evidence">Note that a 50% fall needs a 100% gain to recover.</p>
      </section>
    </div>
  );
}
