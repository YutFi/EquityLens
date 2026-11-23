import { Link } from 'react-router-dom';
import type { Metrics } from '../analytics/metrics';

/** Dropdown of companies that have price data loaded, with a clear empty state instead of fake rows. */
export function CompanyPicker({ rows, value, onChange }: { rows: Metrics[]; value: string; onChange: (id: string) => void }) {
  if (!rows.length) {
    return <div className="panel empty"><h2>No companies with data yet</h2><p>Import price history or load the demo data first. Pages like this one only work on data you have loaded.</p><Link className="btn primary" to="/data-sources">Go to Data Sources</Link></div>;
  }
  return (
    <label className="field" style={{ maxWidth: 360 }}>Company
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {rows.map((m) => <option key={m.security.id} value={m.security.id}>{m.security.code} · {m.security.name}</option>)}
      </select>
    </label>
  );
}
