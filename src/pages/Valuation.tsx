import { useState } from 'react';
import { peerMultiples } from '../analytics/metrics';
import { CompanyPicker } from '../components/CompanyPicker';
import { FundamentalsDialog } from '../components/FundamentalsDialog';
import { Page } from '../components/Layout';
import { ValuationPanel } from '../components/research/ValuationPanel';
import { useApp } from '../state/AppContext';
import { useMetrics } from '../state/useMetrics';

export function Valuation() {
  const app = useApp();
  const { all } = useMetrics();
  const [pick, setPick] = useState('');
  const [edit, setEdit] = useState(false);
  const m = all.find((x) => x.security.id === pick) ?? all[0];
  return (
    <Page title="Valuation" subtitle="Discounted cash flow, relative valuation and dividend models with every assumption visible. Estimates, not recommendations.">
      <div className="stack">
        <CompanyPicker rows={all} value={m?.security.id ?? ''} onChange={setPick} />
        {m && (
          <ValuationPanel fundamentals={app.state.fundamentalsById[m.security.id] ?? null} price={m.last} bars={m.series.bars} peers={peerMultiples(all, m.security)} currency={m.security.currency} onEdit={() => setEdit(true)} />
        )}
        {m && edit && <FundamentalsDialog security={m.security} onClose={() => setEdit(false)} />}
      </div>
    </Page>
  );
}
