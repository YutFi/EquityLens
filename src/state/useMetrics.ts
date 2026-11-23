import { useMemo } from 'react';
import { computeMetrics, type Metrics } from '../analytics/metrics';
import { useApp } from './AppContext';

/** Metrics for every equity of the selected market that has price data loaded. Recomputed only when data changes. */
export function useMetrics(): { all: Metrics[]; benchmark: Metrics | null; byId: Record<string, Metrics> } {
  const app = useApp();
  const { seriesById, fundamentalsById, settings } = app.state;
  return useMemo(() => {
    const inMarket = app.securities.filter((s) => s.market === settings.market);
    const benchSec = inMarket.find((s) => s.kind === 'index' && s.benchmark) ?? null;
    const benchSeries = benchSec ? seriesById[benchSec.id] ?? null : null;
    const all: Metrics[] = [];
    for (const s of inMarket) {
      if (s.kind !== 'equity') continue;
      const series = seriesById[s.id];
      if (!series) continue;
      const m = computeMetrics(s, series, fundamentalsById[s.id] ?? null, benchSeries);
      if (m) all.push(m);
    }
    const benchmark = benchSec && benchSeries ? computeMetrics(benchSec, benchSeries, null, null) : null;
    const byId: Record<string, Metrics> = {};
    for (const m of all) byId[m.security.id] = m;
    return { all, benchmark, byId };
  }, [app.securities, seriesById, fundamentalsById, settings.market]);
}
