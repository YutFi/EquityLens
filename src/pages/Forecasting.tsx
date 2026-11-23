import { useState } from 'react';
import { CompanyPicker } from '../components/CompanyPicker';
import { Page } from '../components/Layout';
import { ForecastPanel } from '../components/research/ForecastPanel';
import { useMetrics } from '../state/useMetrics';

export function Forecasting() {
  const { all } = useMetrics();
  const [pick, setPick] = useState('');
  const m = all.find((x) => x.security.id === pick) ?? all[0];
  return (
    <Page title="Forecasting" subtitle="Transparent statistical scenarios with a walk-forward backtest, a naive baseline and honest uncertainty.">
      <div className="stack">
        <CompanyPicker rows={all} value={m?.security.id ?? ''} onChange={setPick} />
        {m && <ForecastPanel key={m.security.id} bars={m.series.bars} currency={m.security.currency} />}
      </div>
    </Page>
  );
}
