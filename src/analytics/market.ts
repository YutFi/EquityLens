import type { PriceSeries, Security } from '../core/types';
import { annualisedVolatility, pctChange, periodReturn, PERIODS } from './returns';

export interface MarketRow {
  security: Security;
  series: PriceSeries;
  asOf: string;
  last: number;
  prev: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  avgVolume20: number | null;
  /** last volume / previous-20-bar average volume */
  volumeRatio: number | null;
  /** close x volume of the latest bar, in the security's currency */
  tradedValue: number | null;
  vol20: number | null;
  /** true when the latest bar is older than the market reference date */
  stale: boolean;
}

export function buildRow(security: Security, series: PriceSeries, referenceDate: string): MarketRow | null {
  const bars = series.bars;
  if (bars.length === 0) return null;
  const last = bars[bars.length - 1];
  const prevBar = bars.length > 1 ? bars[bars.length - 2] : null;
  const prior = bars.slice(-21, -1).map((b) => b.v).filter((v): v is number => v != null);
  const avg = prior.length >= 10 ? prior.reduce((a, b) => a + b, 0) / prior.length : null;
  return {
    security,
    series,
    asOf: last.t,
    last: last.c,
    prev: prevBar ? prevBar.c : null,
    change: prevBar ? last.c - prevBar.c : null,
    changePct: prevBar ? pctChange(prevBar.c, last.c) : null,
    volume: last.v,
    avgVolume20: avg,
    volumeRatio: avg && last.v != null ? last.v / avg : null,
    tradedValue: last.v != null ? last.v * last.c : null,
    vol20: annualisedVolatility(bars, 20),
    stale: last.t < referenceDate,
  };
}

export interface MarketView {
  referenceDate: string | null;
  /** Rows on the reference date, safe to compare with one another. */
  rows: MarketRow[];
  /** Rows whose latest bar is older than the reference date. Excluded from movers and breadth. */
  staleRows: MarketRow[];
  benchmark: MarketRow | null;
  benchmarkSecurity: Security | null;
  breadth: { advancing: number; declining: number; unchanged: number; total: number };
}

/**
 * Builds the dashboard view from locally loaded series only. The "market" here is exactly the set
 * of securities the user has loaded: it is never presented as the whole exchange.
 */
export function buildMarketView(
  securities: Security[],
  seriesById: Record<string, PriceSeries>,
  marketId: string,
): MarketView {
  const inMarket = securities.filter((s) => s.market === marketId && seriesById[s.id]?.bars.length);
  const benchSec = inMarket.find((s) => s.kind === 'index' && s.benchmark) ?? null;
  const equities = inMarket.filter((s) => s.kind === 'equity');

  const lastDates = equities.map((s) => seriesById[s.id].bars[seriesById[s.id].bars.length - 1].t);
  const referenceDate = lastDates.length ? lastDates.reduce((a, b) => (a > b ? a : b)) : null;

  const rows: MarketRow[] = [];
  const staleRows: MarketRow[] = [];
  if (referenceDate) {
    for (const s of equities) {
      const row = buildRow(s, seriesById[s.id], referenceDate);
      if (!row) continue;
      (row.stale ? staleRows : rows).push(row);
    }
  }
  const benchmark = benchSec
    ? buildRow(benchSec, seriesById[benchSec.id], referenceDate ?? seriesById[benchSec.id].bars.at(-1)!.t)
    : null;

  let advancing = 0;
  let declining = 0;
  let unchanged = 0;
  for (const r of rows) {
    if (r.change == null) continue;
    if (r.change > 0) advancing++;
    else if (r.change < 0) declining++;
    else unchanged++;
  }
  return {
    referenceDate, rows, staleRows, benchmark, benchmarkSecurity: benchSec,
    breadth: { advancing, declining, unchanged, total: advancing + declining + unchanged },
  };
}

export interface RelativeRow {
  security: Security;
  returns: Record<string, { stock: number | null; bench: number | null; relative: number | null }>;
}

/** Stock return minus benchmark return over each standard window; null when either side lacks history. */
export function relativePerformance(rows: MarketRow[], benchmark: PriceSeries | null): RelativeRow[] {
  return rows.map((r) => {
    const returns: RelativeRow['returns'] = {};
    for (const p of PERIODS) {
      const stock = periodReturn(r.series.bars, p.days);
      const bench = benchmark ? periodReturn(benchmark.bars, p.days) : null;
      returns[p.key] = { stock, bench, relative: stock != null && bench != null ? stock - bench : null };
    }
    return { security: r.security, returns };
  });
}
