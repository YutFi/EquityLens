import type { Bar } from '../core/types';

/** Every function returns an array aligned 1:1 with the input; positions without enough history are null. */
export type Series = (number | null)[];

export function sma(values: number[], n: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (n < 1) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

/** EMA seeded with the SMA of the first n values (the usual convention). */
export function ema(values: number[], n: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (n < 1 || values.length < n) return out;
  const k = 2 / (n + 1);
  let prev = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out[n - 1] = prev;
  for (let i = n; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. Returns 100 when there were no losses in the window and 50 when the price never moved. */
export function rsi(closes: number[], n = 14): Series {
  const out: Series = new Array(closes.length).fill(null);
  if (closes.length <= n) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= n;
  loss /= n;
  const val = (g: number, l: number) => (g === 0 && l === 0 ? 50 : l === 0 ? 100 : 100 - 100 / (1 + g / l));
  out[n] = val(gain, loss);
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = val(gain, loss);
  }
  return out;
}

export interface MacdResult { macd: Series; signal: Series; hist: Series }

export function macd(closes: number[], fast = 12, slow = 26, signalN = 9): MacdResult {
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const line: Series = closes.map((_, i) => (f[i] != null && s[i] != null ? (f[i] as number) - (s[i] as number) : null));
  const firstIdx = line.findIndex((v) => v != null);
  const signal: Series = new Array(closes.length).fill(null);
  if (firstIdx >= 0) {
    const sub = line.slice(firstIdx) as number[];
    const e = ema(sub, signalN);
    e.forEach((v, i) => { signal[firstIdx + i] = v; });
  }
  const hist: Series = line.map((v, i) => (v != null && signal[i] != null ? v - (signal[i] as number) : null));
  return { macd: line, signal, hist };
}

export interface BollingerResult { mid: Series; upper: Series; lower: Series }

/** Bollinger Bands using the population standard deviation, as is conventional. */
export function bollinger(closes: number[], n = 20, k = 2): BollingerResult {
  const mid = sma(closes, n);
  const upper: Series = new Array(closes.length).fill(null);
  const lower: Series = new Array(closes.length).fill(null);
  for (let i = n - 1; i < closes.length; i++) {
    const m = mid[i] as number;
    let ss = 0;
    for (let j = i - n + 1; j <= i; j++) ss += (closes[j] - m) ** 2;
    const sd = Math.sqrt(ss / n);
    upper[i] = m + k * sd;
    lower[i] = m - k * sd;
  }
  return { mid, upper, lower };
}

/** Average True Range (Wilder smoothing). */
export function atr(bars: Bar[], n = 14): Series {
  const out: Series = new Array(bars.length).fill(null);
  if (bars.length <= n) return out;
  const tr: number[] = bars.map((b, i) => (i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c))));
  let prev = tr.slice(1, n + 1).reduce((a, b) => a + b, 0) / n;
  out[n] = prev;
  for (let i = n + 1; i < bars.length; i++) {
    prev = (prev * (n - 1) + tr[i]) / n;
    out[i] = prev;
  }
  return out;
}

/** Rate of change over n bars, in percent. */
export function momentum(closes: number[], n = 10): Series {
  return closes.map((c, i) => (i >= n && closes[i - n] !== 0 ? ((c - closes[i - n]) / closes[i - n]) * 100 : null));
}

export interface Levels { supports: number[]; resistances: number[] }

/**
 * Support and resistance from swing points: a bar whose low (high) is the lowest (highest) within
 * `wing` bars either side. Nearby levels (within `tolerancePct`) are merged. Levels are descriptive
 * history, not predictions.
 */
export function supportResistance(bars: Bar[], wing = 5, lookback = 250, tolerancePct = 1.5, maxLevels = 3): Levels {
  const slice = bars.slice(-lookback);
  const lows: number[] = [];
  const highs: number[] = [];
  for (let i = wing; i < slice.length - wing; i++) {
    let isLow = true;
    let isHigh = true;
    for (let j = i - wing; j <= i + wing; j++) {
      if (slice[j].l < slice[i].l) isLow = false;
      if (slice[j].h > slice[i].h) isHigh = false;
    }
    if (isLow) lows.push(slice[i].l);
    if (isHigh) highs.push(slice[i].h);
  }
  const last = slice.length ? slice[slice.length - 1].c : 0;
  const cluster = (levels: number[]): number[] => {
    const sorted = [...levels].sort((a, b) => a - b);
    const groups: number[][] = [];
    for (const v of sorted) {
      const g = groups[groups.length - 1];
      if (g && (v - g[0]) / g[0] * 100 <= tolerancePct) g.push(v); else groups.push([v]);
    }
    return groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  };
  const supports = cluster(lows).filter((v) => v < last).sort((a, b) => b - a).slice(0, maxLevels);
  const resistances = cluster(highs).filter((v) => v > last).sort((a, b) => a - b).slice(0, maxLevels);
  return { supports, resistances };
}

export interface IndicatorSnapshot {
  sma20: number | null; sma50: number | null; sma200: number | null;
  ema12: number | null; ema26: number | null;
  rsi14: number | null;
  macd: number | null; macdSignal: number | null; macdHist: number | null;
  bbUpper: number | null; bbMid: number | null; bbLower: number | null; bbPercentB: number | null;
  atr14: number | null; atrPct: number | null;
  momentum10: number | null; momentum60: number | null;
  levels: Levels;
}

const lastOf = (s: Series): number | null => (s.length ? s[s.length - 1] : null);

export function snapshot(bars: Bar[]): IndicatorSnapshot {
  const closes = bars.map((b) => b.c);
  const m = macd(closes);
  const bb = bollinger(closes);
  const a = lastOf(atr(bars));
  const last = closes.length ? closes[closes.length - 1] : null;
  const up = lastOf(bb.upper);
  const lo = lastOf(bb.lower);
  return {
    sma20: lastOf(sma(closes, 20)), sma50: lastOf(sma(closes, 50)), sma200: lastOf(sma(closes, 200)),
    ema12: lastOf(ema(closes, 12)), ema26: lastOf(ema(closes, 26)),
    rsi14: lastOf(rsi(closes)),
    macd: lastOf(m.macd), macdSignal: lastOf(m.signal), macdHist: lastOf(m.hist),
    bbUpper: up, bbMid: lastOf(bb.mid), bbLower: lo,
    bbPercentB: up != null && lo != null && last != null && up !== lo ? (last - lo) / (up - lo) : null,
    atr14: a, atrPct: a != null && last ? (a / last) * 100 : null,
    momentum10: lastOf(momentum(closes, 10)), momentum60: lastOf(momentum(closes, 60)),
    levels: supportResistance(bars),
  };
}

export interface Reading { name: string; value: string; plain: string }

const f2 = (n: number | null, d = 2) => (n == null ? '–' : n.toFixed(d));

/**
 * Beginner-friendly, neutral descriptions of what each indicator currently shows. They describe
 * the past and never say to buy or sell.
 */
export function readIndicators(s: IndicatorSnapshot, last: number | null): Reading[] {
  const out: Reading[] = [];
  if (s.rsi14 != null) {
    out.push({
      name: 'RSI (14)', value: f2(s.rsi14, 1),
      plain: s.rsi14 >= 70
        ? 'Prices have risen strongly in the last two weeks or so. Readings above 70 are often called "overbought", which describes recent speed, not a forecast.'
        : s.rsi14 <= 30
          ? 'Prices have fallen sharply in the last two weeks or so. Readings below 30 are often called "oversold", which describes recent speed, not a forecast.'
          : 'Recent gains and losses are fairly balanced (between 30 and 70).',
    });
  }
  if (s.macd != null && s.macdSignal != null) {
    out.push({
      name: 'MACD (12, 26, 9)', value: `${f2(s.macd, 3)} / ${f2(s.macdSignal, 3)}`,
      plain: s.macd > s.macdSignal
        ? 'The short-term trend line is above its smoothed signal line, meaning recent momentum has been stronger than its recent average.'
        : 'The short-term trend line is below its smoothed signal line, meaning recent momentum has been weaker than its recent average.',
    });
  }
  if (last != null && s.sma50 != null) {
    out.push({
      name: 'Price vs 50-day average', value: `${f2(last, 3)} vs ${f2(s.sma50, 3)}`,
      plain: last >= s.sma50 ? 'The latest close is above its 50-day average (a medium-term trend gauge).' : 'The latest close is below its 50-day average (a medium-term trend gauge).',
    });
  }
  if (last != null && s.sma200 != null) {
    out.push({
      name: 'Price vs 200-day average', value: `${f2(last, 3)} vs ${f2(s.sma200, 3)}`,
      plain: last >= s.sma200 ? 'The latest close is above its 200-day average (a long-term trend gauge).' : 'The latest close is below its 200-day average (a long-term trend gauge).',
    });
  }
  if (s.bbPercentB != null) {
    out.push({
      name: 'Bollinger %B', value: f2(s.bbPercentB, 2),
      plain: s.bbPercentB > 1 ? 'The close is above the upper band: unusually high compared with the last 20 days.' : s.bbPercentB < 0 ? 'The close is below the lower band: unusually low compared with the last 20 days.' : 'The close is inside the bands (0 = lower band, 1 = upper band).',
    });
  }
  if (s.atrPct != null) {
    out.push({ name: 'ATR (14)', value: `${f2(s.atr14, 3)} (${f2(s.atrPct, 1)}% of price)`, plain: 'The typical daily trading range recently. Higher means the price has been moving more each day.' });
  }
  return out;
}
