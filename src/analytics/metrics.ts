import type { Fundamentals } from '../core/fundamentals';
import type { PriceSeries, Security } from '../core/types';
import { assessHealth, type HealthResult } from './health';
import { rsi, sma } from './indicators';
import { computeRatios, ratioValue, type Ratio } from './ratios';
import { annualisedVolatility, maxDrawdown, pctChange, periodReturn } from './returns';

/** One row of everything we can say about a company from the data loaded. Null means "not available", never "bad". */
export interface Metrics {
  security: Security;
  series: PriceSeries;
  fundamentals: Fundamentals | null;
  last: number;
  asOf: string;
  changePct: number | null;
  ret1M: number | null;
  ret3M: number | null;
  ret6M: number | null;
  ret1Y: number | null;
  rel3M: number | null;
  vol20: number | null;
  maxDD: number | null;
  rsi14: number | null;
  sma50: number | null;
  sma200: number | null;
  volumeRatio: number | null;
  tradedValue: number | null;
  ratios: Ratio[] | null;
  pe: number | null;
  pb: number | null;
  ps: number | null;
  roe: number | null;
  dividendYield: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  health: HealthResult | null;
}

const lastNum = (a: (number | null)[]) => (a.length ? a[a.length - 1] : null);

export function computeMetrics(security: Security, series: PriceSeries, fundamentals: Fundamentals | null, benchmark: PriceSeries | null): Metrics | null {
  const bars = series.bars;
  if (!bars.length) return null;
  const last = bars[bars.length - 1];
  const prev = bars.length > 1 ? bars[bars.length - 2] : null;
  const closes = bars.map((b) => b.c);
  const prior = bars.slice(-21, -1).map((b) => b.v).filter((v): v is number => v != null);
  const avgVol = prior.length >= 10 ? prior.reduce((a, b) => a + b, 0) / prior.length : null;
  const ret3M = periodReturn(bars, 91);
  const bench3M = benchmark ? periodReturn(benchmark.bars, 91) : null;
  const ratios = fundamentals ? computeRatios({ fundamentals, price: last.c }) : null;
  return {
    security, series, fundamentals,
    last: last.c, asOf: last.t,
    changePct: prev ? pctChange(prev.c, last.c) : null,
    ret1M: periodReturn(bars, 30), ret3M, ret6M: periodReturn(bars, 182), ret1Y: periodReturn(bars, 365),
    rel3M: ret3M != null && bench3M != null ? ret3M - bench3M : null,
    vol20: annualisedVolatility(bars, 20), maxDD: maxDrawdown(bars),
    rsi14: lastNum(rsi(closes)), sma50: lastNum(sma(closes, 50)), sma200: lastNum(sma(closes, 200)),
    volumeRatio: avgVol && last.v != null ? last.v / avgVol : null,
    tradedValue: last.v != null ? last.v * last.c : null,
    ratios,
    pe: ratios ? ratioValue(ratios, 'pe') : null, pb: ratios ? ratioValue(ratios, 'pb') : null, ps: ratios ? ratioValue(ratios, 'ps') : null,
    roe: ratios ? ratioValue(ratios, 'roe') : null, dividendYield: ratios ? ratioValue(ratios, 'dividendYield') : null,
    revenueGrowth: ratios ? ratioValue(ratios, 'revenueGrowth') : null, earningsGrowth: ratios ? ratioValue(ratios, 'earningsGrowth') : null,
    health: fundamentals ? assessHealth(fundamentals, last.c) : null,
  };
}

/** Peer multiples for one company: the other loaded companies in the same sector. */
export function peerMultiples(all: Metrics[], self: Security): { pe: number[]; pb: number[]; ps: number[] } {
  const peers = all.filter((m) => m.security.id !== self.id && self.sector && m.security.sector === self.sector && m.security.kind === 'equity');
  const pick = (k: 'pe' | 'pb' | 'ps') => peers.map((m) => m[k]).filter((x): x is number => x != null && x > 0);
  return { pe: pick('pe'), pb: pick('pb'), ps: pick('ps') };
}
