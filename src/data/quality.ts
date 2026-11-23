import type { Bar, DataQuality, Frequency } from '../core/types';
import { daysBetween, toISODate, weekdaysBetween } from '../core/dates';

export const STALE_AFTER_DAYS = 7;
export const GAP_WEEKDAYS = 10;

export function detectFrequency(bars: Bar[]): Frequency | null {
  if (bars.length < 3) return null;
  const gaps: number[] = [];
  for (let i = 1; i < bars.length; i++) gaps.push(daysBetween(bars[i - 1].t, bars[i].t));
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  if (median <= 4) return 'daily';
  if (median <= 10) return 'weekly';
  return 'monthly';
}

export function findGaps(bars: Bar[], minWeekdays = GAP_WEEKDAYS): { from: string; to: string; weekdays: number }[] {
  const gaps: { from: string; to: string; weekdays: number }[] = [];
  for (let i = 1; i < bars.length; i++) {
    const w = weekdaysBetween(bars[i - 1].t, bars[i].t);
    if (w >= minWeekdays) gaps.push({ from: bars[i - 1].t, to: bars[i].t, weekdays: w });
  }
  return gaps;
}

export interface AssessInput {
  bars: Bar[];
  source: string;
  currency: string;
  now?: Date;
  rejectedRows?: number;
  duplicatesRemoved?: number;
  synthetic?: boolean;
}

/**
 * Derives the data-quality record for a series. The app never labels user-supplied data "verified":
 * it cannot independently confirm that a file matches the exchange record.
 */
export function assessSeries(input: AssessInput): DataQuality {
  const { bars, source, currency, synthetic = false } = input;
  const now = input.now ?? new Date();
  const notes: string[] = [];
  if (bars.length === 0) {
    return {
      source, lastUpdated: now.toISOString(), observationDate: null, currency,
      reportingPeriod: null, frequency: null, status: 'unavailable', notes: ['No observations.'],
    };
  }
  const first = bars[0].t;
  const last = bars[bars.length - 1].t;
  const frequency = detectFrequency(bars);
  const ageDays = daysBetween(last, toISODate(now));
  const gaps = frequency === 'daily' ? findGaps(bars) : [];
  const rejected = input.rejectedRows ?? 0;

  let status: DataQuality['status'] = 'historical';
  if (synthetic) {
    status = 'demo';
    notes.push('Synthetic data generated in your browser for interface demonstration. Not real market data.');
  } else {
    notes.push('User-supplied end-of-day history. The app cannot independently verify it against the exchange record.');
    if (ageDays > STALE_AFTER_DAYS) {
      status = 'stale';
      notes.push(`Latest observation is ${ageDays} days old.`);
    }
    if (rejected > 0 || gaps.length > 0) {
      status = 'incomplete';
      if (rejected > 0) notes.push(`${rejected} row(s) were rejected during import.`);
      if (gaps.length > 0) notes.push(`${gaps.length} gap(s) of ${GAP_WEEKDAYS}+ weekdays (public holidays are not accounted for).`);
    }
  }
  if (input.duplicatesRemoved) notes.push(`${input.duplicatesRemoved} duplicate date(s) removed (last occurrence kept).`);

  return {
    source,
    lastUpdated: now.toISOString(),
    observationDate: last,
    currency,
    reportingPeriod: `${first} to ${last}`,
    frequency,
    status,
    notes,
  };
}
