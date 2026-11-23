import { FIELD_LABELS, PER_SHARE_FIELDS, periodsOf, type Fundamentals, type StatementField } from '../../core/fundamentals';
import { fmtCompact } from '../../core/format';
import { assessHealth } from '../../analytics/health';
import { computeRatios } from '../../analytics/ratios';

const SHOWN: StatementField[] = [
  'revenue', 'costOfRevenue', 'operatingIncome', 'interestExpense', 'netIncome', 'eps', 'dividendsPerShare',
  'totalAssets', 'currentAssets', 'totalLiabilities', 'currentLiabilities', 'totalDebt', 'equity', 'cash',
  'operatingCashFlow', 'capex', 'freeCashFlow',
];

const fmtRatio = (v: number | null, unit: 'x' | '%') => (v == null ? '–' : unit === 'x' ? `${v.toFixed(2)}x` : `${v.toFixed(2)}%`);

/** Statements as entered, ratios with formulas, and the transparent health score. */
export function FinancialsPanel({ fundamentals, price, onEdit }: { fundamentals: Fundamentals | null; price: number | null; onEdit: () => void }) {
  if (!fundamentals || !fundamentals.periods.length) {
    return (
      <div className="panel empty">
        <h2>No financial statements loaded</h2>
        <p>There is no free licensed feed of Bursa company statements, so EquityLens asks you to enter or import the figures from the company&apos;s published report. Ratios, the health score, valuation and the opportunity scanner all need them. Nothing is estimated in the meantime.</p>
        <button type="button" className="btn primary" onClick={onEdit}>Enter or import financials</button>
      </div>
    );
  }
  const annual = periodsOf(fundamentals, 'annual');
  const quarterly = periodsOf(fundamentals, 'quarterly');
  const ratios = computeRatios({ fundamentals, price });
  const health = assessHealth(fundamentals, price);
  const shown = SHOWN.filter((f) => annual.some((p) => p[f] != null));

  return (
    <div className="stack">
      <div className="banner warn"><b>Entered by you.</b>{fundamentals.source}. EquityLens has not verified these figures. Last saved {fundamentals.loadedAt.slice(0, 10)}. {fundamentals.sharesOutstanding ? `Shares outstanding: ${fundamentals.sharesOutstanding.toLocaleString()}.` : 'Shares outstanding not entered, so market cap and per-share values are unavailable.'}</div>

      <section className="panel" aria-label="Financial health">
        <header><h2>Financial health score</h2><button type="button" className="btn" onClick={onEdit}>Add or replace figures</button></header>
        {health.score == null ? (
          <p className="muted"><b>Insufficient data.</b> {health.notes.join(' ')} Only {health.coverage.toFixed(0)}% of the model could be evaluated; at least 50% is needed.</p>
        ) : (
          <div className="row" style={{ alignItems: 'baseline', gap: 16 }}>
            <span className="num" style={{ fontSize: 34, fontWeight: 700 }}>{health.score.toFixed(0)}<span className="muted" style={{ fontSize: 16 }}>/100</span></span>
            <span><b>{health.classification}</b><br /><span className="muted">{health.coverage.toFixed(0)}% of the model had data</span></span>
          </div>
        )}
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="t">
            <caption className="sr-only">Health score components</caption>
            <thead><tr><th>Component</th><th className="r">Weight</th><th className="r">Score</th><th>Why</th></tr></thead>
            <tbody>
              {health.components.map((c) => (
                <tr key={c.key}>
                  <td>{c.label}</td><td className="r num">{c.weight}</td>
                  <td className="r num">{!c.applicable ? 'n/a' : c.score == null ? 'no data' : c.score.toFixed(0)}</td>
                  <td className="dim">{c.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="evidence">Components without data are left out and the remaining weights re-scaled to 100, never scored as poor. A score summarises the figures you entered; it is not a rating or a recommendation. {health.notes.join(' ')}</p>
      </section>

      <section className="panel" aria-label="Ratios">
        <header><h2>Ratios</h2></header>
        <div className="table-wrap">
          <table className="t">
            <caption className="sr-only">Ratios with formulas and source periods</caption>
            <thead><tr><th>Ratio</th><th className="r">Value</th><th>Formula</th><th>Period</th><th>Why blank</th></tr></thead>
            <tbody>
              {ratios.map((r) => (
                <tr key={r.key}><td>{r.label}</td><td className="r num">{fmtRatio(r.value, r.unit)}</td><td className="dim wrap">{r.formula}</td><td className="num">{r.period ?? '–'}</td><td className="dim wrap">{r.value == null ? r.note ?? '' : ''}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="evidence">A dash means the ratio cannot be computed from the figures entered (or is not meaningful, for example P/E on a loss). Prices used are the latest close in your loaded history.</p>
      </section>

      <section className="panel" aria-label="Statements">
        <header><h2>Annual statements (as entered)</h2></header>
        <div className="table-wrap">
          <table className="t">
            <caption className="sr-only">Annual statement figures</caption>
            <thead><tr><th>Line</th>{annual.map((p) => <th key={p.periodEnd} className="r">{p.periodEnd}</th>)}</tr></thead>
            <tbody>
              {shown.map((f) => (
                <tr key={f}><td>{FIELD_LABELS[f]}</td>{annual.map((p) => <td key={p.periodEnd} className="r num">{p[f] == null ? '–' : PER_SHARE_FIELDS.includes(f) ? (p[f] as number).toFixed(3) : fmtCompact(p[f] as number)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        {quarterly.length > 0 && <p className="evidence">{quarterly.length} quarterly period(s) are stored; the ratio and health models use annual periods only.</p>}
      </section>
    </div>
  );
}
