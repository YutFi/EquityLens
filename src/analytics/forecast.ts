import { addDays } from '../core/dates';
import type { Bar } from '../core/types';

/**
 * Transparent statistical forecasting. It describes what simple models extrapolated from the past
 * would imply; it does not know about news, earnings, or the economy, and it is frequently wrong.
 *
 * Methods (all on log prices): naive (last price), moving-average (reverts to the 20-day mean),
 * drift (average historical return), linear regression trend, damped Holt exponential smoothing,
 * and an ensemble (mean of drift, regression and Holt in log space). ARIMA is intentionally NOT
 * implemented: it could not be validated properly here, and an unvalidated model would only look sophisticated.
 *
 * Uncertainty bands come from historical daily volatility scaled by √horizon (80% band). The
 * "bullish" and "bearish" scenarios are the edges of that band, not forecasts of good or bad news.
 *
 * Reliability is measured by walk-forward backtesting: at each historical origin only data up to
 * that date is used. The method is CHOSEN on the first half of the origins and its error is REPORTED
 * on the second half, so the reported accuracy is not flattered by the selection.
 */

export type MethodId = 'naive' | 'ma' | 'drift' | 'regression' | 'holt' | 'ensemble';

export const METHODS: { id: MethodId; name: string; plain: string }[] = [
  { id: 'naive', name: 'Naive (last price)', plain: 'Assumes the price stays where it is. The baseline every other method must beat.' },
  { id: 'ma', name: '20-day average', plain: 'Assumes the price drifts back to its recent 20-day average.' },
  { id: 'drift', name: 'Drift', plain: 'Continues the average daily return seen in the history.' },
  { id: 'regression', name: 'Linear trend', plain: 'Extends a straight line fitted to the last ~120 days of log prices.' },
  { id: 'holt', name: 'Damped exponential smoothing', plain: 'Extends a smoothed level and trend, with the trend fading out over time.' },
  { id: 'ensemble', name: 'Ensemble', plain: 'Averages the drift, linear trend and smoothing forecasts.' },
];

export const HORIZONS = [
  { key: '7D', label: '7 days', calendarDays: 7, bars: 5 },
  { key: '30D', label: '30 days', calendarDays: 30, bars: 21 },
  { key: '90D', label: '90 days', calendarDays: 90, bars: 63 },
  { key: '6M', label: '6 months', calendarDays: 182, bars: 126 },
  { key: '1Y', label: '1 year', calendarDays: 365, bars: 252 },
] as const;
export type HorizonKey = (typeof HORIZONS)[number]['key'];

export const MIN_HISTORY_BARS = 150;
const MIN_TRAIN = 120;
const Z80 = 1.2815515655;

type PointFn = (logs: number[], h: number) => number;

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

function stdev(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

/** Daily log-return volatility from (up to) the last 250 observations. */
export function dailySigma(logs: number[]): number {
  const w = logs.slice(-251);
  const r: number[] = [];
  for (let i = 1; i < w.length; i++) r.push(w[i] - w[i - 1]);
  return stdev(r);
}

const naive: PointFn = (l) => l[l.length - 1];
const ma: PointFn = (l) => mean(l.slice(-20));
const drift: PointFn = (l, h) => {
  const w = l.slice(-251);
  return l[l.length - 1] + ((w[w.length - 1] - w[0]) / Math.max(1, w.length - 1)) * h;
};
const regression: PointFn = (l, h) => {
  const w = l.slice(-120);
  const n = w.length;
  const tm = (n - 1) / 2;
  const ym = mean(w);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) { num += (i - tm) * (w[i] - ym); den += (i - tm) ** 2; }
  const b = den === 0 ? 0 : num / den;
  return ym + b * (n - 1 + h - tm);
};

/** Damped Holt; alpha and beta chosen by minimising one-step in-sample squared error over a small grid. */
const holt: PointFn = (l, h) => {
  const w = l.slice(-250);
  const phi = 0.9;
  let best = { sse: Infinity, level: w[w.length - 1], trend: 0 };
  for (const a of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    for (const b of [0.05, 0.1, 0.2, 0.4]) {
      let level = w[0];
      let trend = w.length > 1 ? w[1] - w[0] : 0;
      let sse = 0;
      for (let i = 1; i < w.length; i++) {
        const pred = level + phi * trend;
        sse += (w[i] - pred) ** 2;
        const nl = a * w[i] + (1 - a) * pred;
        trend = b * (nl - level) + (1 - b) * phi * trend;
        level = nl;
      }
      if (sse < best.sse) best = { sse, level, trend };
    }
  }
  let damp = 0;
  for (let k = 1; k <= h; k++) damp += Math.pow(phi, k);
  return best.level + damp * best.trend;
};
const ensemble: PointFn = (l, h) => (drift(l, h) + regression(l, h) + holt(l, h)) / 3;

const FN: Record<MethodId, PointFn> = { naive, ma, drift, regression, holt, ensemble };

export interface Interval { point: number; lower: number; upper: number }

/** Forecast `h` steps ahead as prices: central value plus an 80% band. */
export function forecastAt(logs: number[], h: number, method: MethodId): Interval {
  const c = FN[method](logs, h);
  const half = Z80 * dailySigma(logs) * Math.sqrt(h);
  return { point: Math.exp(c), lower: Math.exp(c - half), upper: Math.exp(c + half) };
}

export interface BacktestPoint { originDate: string; forecast: number; lower: number; upper: number; actual: number; lastKnown: number }

export interface MethodMetrics {
  method: MethodId;
  n: number;
  mae: number | null;
  rmse: number | null;
  /** Mean absolute percentage error, in percent. */
  mape: number | null;
  /** Share of correct up/down calls, in percent; null for methods that never predict a change. */
  directional: number | null;
  /** Share of actual outcomes inside the 80% band, in percent. */
  coverage: number | null;
  /** 1 − MAE/MAE(naive) on the same origins. Positive means better than naive. */
  skill: number | null;
}

interface Run { selection: BacktestPoint[]; holdout: BacktestPoint[] }

function originsFor(n: number, h: number): number[] {
  const step = Math.max(1, Math.round(h / 3));
  const out: number[] = [];
  for (let i = MIN_TRAIN - 1; i + h <= n - 1; i += step) out.push(i);
  // keep the most recent ~300 origins so run time stays bounded
  return out.slice(-300);
}

export function backtestMethod(bars: Bar[], h: number, method: MethodId): Run {
  const closes = bars.map((b) => b.c);
  const logs = closes.map(Math.log);
  const origins = originsFor(bars.length, h);
  const pts: BacktestPoint[] = origins.map((i) => {
    const f = forecastAt(logs.slice(0, i + 1), h, method); // only data up to the origin: no look-ahead
    return { originDate: bars[i].t, forecast: f.point, lower: f.lower, upper: f.upper, actual: closes[i + h], lastKnown: closes[i] };
  });
  const mid = Math.floor(pts.length / 2);
  return { selection: pts.slice(0, mid), holdout: pts.slice(mid) };
}

export function metricsOf(points: BacktestPoint[], method: MethodId, naivePoints?: BacktestPoint[]): MethodMetrics {
  const n = points.length;
  if (!n) return { method, n: 0, mae: null, rmse: null, mape: null, directional: null, coverage: null, skill: null };
  const err = points.map((p) => p.forecast - p.actual);
  const mae = mean(err.map(Math.abs));
  const rmse = Math.sqrt(mean(err.map((e) => e * e)));
  const mape = mean(points.map((p) => Math.abs((p.forecast - p.actual) / p.actual))) * 100;
  const calls = points.filter((p) => p.forecast !== p.lastKnown && p.actual !== p.lastKnown);
  const directional = calls.length ? (calls.filter((p) => Math.sign(p.forecast - p.lastKnown) === Math.sign(p.actual - p.lastKnown)).length / calls.length) * 100 : null;
  const coverage = (points.filter((p) => p.actual >= p.lower && p.actual <= p.upper).length / n) * 100;
  let skill: number | null = null;
  if (naivePoints && naivePoints.length === n) {
    const maeN = mean(naivePoints.map((p) => Math.abs(p.forecast - p.actual)));
    skill = maeN > 0 ? 1 - mae / maeN : null;
  }
  return { method, n, mae, rmse, mape, directional, coverage, skill };
}

export type Reliability = 'insufficient' | 'no-skill' | 'limited';

export interface ForecastResult {
  ok: true;
  horizon: HorizonKey;
  horizonBars: number;
  method: MethodId;
  methodName: string;
  lastClose: number;
  lastDate: string;
  base: number;
  bullish: number;
  bearish: number;
  basePct: number;
  bullishPct: number;
  bearishPct: number;
  /** Per-step path for charting: business-day dates (weekends skipped, holidays unknown). */
  path: { t: string; base: number; lower: number; upper: number }[];
  /** Held-out metrics for every method, naive first. */
  table: MethodMetrics[];
  chosen: MethodMetrics;
  reliability: Reliability;
  reliabilityText: string;
  /** Most recent held-out forecasts versus what happened. */
  recent: BacktestPoint[];
  warnings: string[];
}
export type ForecastOutcome = ForecastResult | { ok: false; reason: string };

function nextBusinessDays(from: string, count: number): string[] {
  const out: string[] = [];
  let d = from;
  while (out.length < count) {
    d = addDays(d, 1);
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d);
  }
  return out;
}

export function runForecast(bars: Bar[], horizon: HorizonKey): ForecastOutcome {
  const hz = HORIZONS.find((x) => x.key === horizon)!;
  if (bars.length < MIN_HISTORY_BARS) {
    return { ok: false, reason: `At least ${MIN_HISTORY_BARS} daily bars are needed to forecast; ${bars.length} are loaded. EquityLens shows no forecast rather than an unreliable one.` };
  }
  const h = hz.bars;
  const ids = METHODS.map((m) => m.id);
  const runs = Object.fromEntries(ids.map((m) => [m, backtestMethod(bars, h, m)])) as Record<MethodId, Run>;
  const nSel = runs.naive.selection.length;
  const nHold = runs.naive.holdout.length;

  const table: MethodMetrics[] = ids.map((m) => metricsOf(runs[m].holdout, m, runs.naive.holdout));
  const selMae = (m: MethodId) => (runs[m].selection.length ? mean(runs[m].selection.map((p) => Math.abs(p.forecast - p.actual))) : Infinity);
  const chosenId: MethodId = nSel >= 5 ? ids.reduce((best, m) => (selMae(m) < selMae(best) ? m : best), 'naive' as MethodId) : 'naive';
  const chosen = table.find((t) => t.method === chosenId)!;

  const warnings: string[] = [
    'Statistical extrapolation of past prices. It cannot anticipate news, earnings, regulation or market shocks.',
    'Backtest origins overlap, so the effective number of independent tests is smaller than shown.',
    'Exchange holidays are not known, so future dates assume every weekday is a trading day.',
  ];
  let reliability: Reliability;
  let reliabilityText: string;
  if (nHold < 15) {
    reliability = 'insufficient';
    reliabilityText = `Only ${nHold} held-out backtest points are available at this horizon, too few to say whether the method works. Treat the numbers as an illustration of the model's arithmetic, not as evidence.`;
  } else if (chosenId === 'naive' || (chosen.skill ?? 0) <= 0) {
    reliability = 'no-skill';
    reliabilityText = 'On held-out history, no method beat the simple "price stays put" baseline. The forecast below should not be relied on.';
  } else if ((chosen.coverage ?? 0) < 60 || (chosen.coverage ?? 100) > 97) {
    reliability = 'no-skill';
    reliabilityText = `The method beat the baseline, but its 80% band contained the outcome ${Math.round(chosen.coverage ?? 0)}% of the time, so the stated uncertainty is not trustworthy.`;
  } else {
    reliability = 'limited';
    reliabilityText = `The method beat the baseline by ${((chosen.skill ?? 0) * 100).toFixed(0)}% (lower average error) on held-out history. That is limited evidence from past data only; it is not a guarantee about the future.`;
  }
  if (chosenId === 'naive') warnings.push('The selected "method" is the baseline, so the base case is simply the latest price.');

  const closes = bars.map((b) => b.c);
  const logs = closes.map(Math.log);
  const last = closes[closes.length - 1];
  const dates = nextBusinessDays(bars[bars.length - 1].t, h);
  const path = dates.map((t, i) => { const f = forecastAt(logs, i + 1, chosenId); return { t, base: f.point, lower: f.lower, upper: f.upper }; });
  const end = forecastAt(logs, h, chosenId);
  const pct = (x: number) => ((x - last) / last) * 100;
  return {
    ok: true, horizon, horizonBars: h, method: chosenId, methodName: METHODS.find((m) => m.id === chosenId)!.name,
    lastClose: last, lastDate: bars[bars.length - 1].t,
    base: end.point, bullish: end.upper, bearish: end.lower,
    basePct: pct(end.point), bullishPct: pct(end.upper), bearishPct: pct(end.lower),
    path, table, chosen, reliability, reliabilityText, recent: runs[chosenId].holdout.slice(-10), warnings,
  };
}
