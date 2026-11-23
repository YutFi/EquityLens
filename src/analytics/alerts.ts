import type { Metrics } from './metrics';

/**
 * Local watchlist alerts. They are evaluated ONLY while EquityLens is open in a browser tab and
 * data has been loaded or refreshed. There is no background monitoring: if the site is closed,
 * nothing is checked and no notification is sent.
 */

export interface AlertRule {
  priceAbove?: number;
  priceBelow?: number;
  /** Absolute one-day move, percent. */
  dayMovePct?: number;
  rsiAbove?: number;
  rsiBelow?: number;
  /** Latest volume as a multiple of its 20-day average. */
  volumeRatioAbove?: number;
  /** Health score below this value (needs statements). */
  healthBelow?: number;
}

export interface WatchItem {
  securityId: string;
  addedAt: string;
  rule: AlertRule;
}

export interface Watchlist {
  id: string;
  name: string;
  items: WatchItem[];
}

export const RULE_LABELS: Record<keyof AlertRule, string> = {
  priceAbove: 'Price at or above', priceBelow: 'Price at or below', dayMovePct: 'One-day move of at least (%)',
  rsiAbove: 'RSI at or above', rsiBelow: 'RSI at or below', volumeRatioAbove: 'Volume at least (x 20-day average)', healthBelow: 'Health score below',
};

/** Returns the human-readable reasons this rule is currently triggered (empty when none). */
export function evaluateAlerts(rule: AlertRule, m: Metrics | null): string[] {
  if (!m) return [];
  const out: string[] = [];
  const code = m.security.code;
  if (rule.priceAbove != null && m.last >= rule.priceAbove) out.push(`${code} closed at ${m.last.toFixed(3)}, at or above your ${rule.priceAbove} target (as of ${m.asOf}).`);
  if (rule.priceBelow != null && m.last <= rule.priceBelow) out.push(`${code} closed at ${m.last.toFixed(3)}, at or below your ${rule.priceBelow} level (as of ${m.asOf}).`);
  if (rule.dayMovePct != null && m.changePct != null && Math.abs(m.changePct) >= rule.dayMovePct) out.push(`${code} moved ${m.changePct.toFixed(2)}% on ${m.asOf}.`);
  if (rule.rsiAbove != null && m.rsi14 != null && m.rsi14 >= rule.rsiAbove) out.push(`${code} RSI is ${m.rsi14.toFixed(1)}, at or above ${rule.rsiAbove}.`);
  if (rule.rsiBelow != null && m.rsi14 != null && m.rsi14 <= rule.rsiBelow) out.push(`${code} RSI is ${m.rsi14.toFixed(1)}, at or below ${rule.rsiBelow}.`);
  if (rule.volumeRatioAbove != null && m.volumeRatio != null && m.volumeRatio >= rule.volumeRatioAbove) out.push(`${code} volume was ${m.volumeRatio.toFixed(2)}x its 20-day average.`);
  if (rule.healthBelow != null && m.health?.score != null && m.health.score < rule.healthBelow) out.push(`${code} health score is ${m.health.score.toFixed(0)}, below ${rule.healthBelow}.`);
  return out;
}

export const hasRule = (rule: AlertRule) => (Object.keys(RULE_LABELS) as (keyof AlertRule)[]).some((k) => rule[k] != null);
