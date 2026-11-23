import type { Bar } from '../core/types';
import { assessSeries, detectFrequency, findGaps } from './quality';
import { addDays, parseISODate } from '../core/dates';

function weekdays(start: string, n: number): Bar[] {
  const out: Bar[] = [];
  let d = start;
  while (out.length < n) {
    const dow = parseISODate(d).getUTCDay();
    if (dow !== 0 && dow !== 6) out.push({ t: d, o: 1, h: 1, l: 1, c: 1, v: 1 });
    d = addDays(d, 1);
  }
  return out;
}

const NOW = new Date('2025-11-24T05:00:00Z');

describe('assessSeries', () => {
  it('labels fresh user data historical, never verified', () => {
    const bars = weekdays('2025-10-20', 25);
    const q = assessSeries({ bars, source: 'file.csv', currency: 'MYR', now: NOW });
    expect(q.status).toBe('historical');
    expect(q.frequency).toBe('daily');
    expect(q.observationDate).toBe(bars[bars.length - 1].t);
  });
  it('marks old data stale', () => {
    const q = assessSeries({ bars: weekdays('2025-01-06', 20), source: 'x', currency: 'MYR', now: NOW });
    expect(q.status).toBe('stale');
  });
  it('marks data with rejected rows incomplete', () => {
    const q = assessSeries({ bars: weekdays('2025-11-03', 15), source: 'x', currency: 'MYR', now: NOW, rejectedRows: 2 });
    expect(q.status).toBe('incomplete');
    expect(q.notes.join(' ')).toMatch(/2 row/);
  });
  it('marks large gaps incomplete', () => {
    const bars = [...weekdays('2025-09-01', 5), ...weekdays('2025-11-03', 5)];
    expect(findGaps(bars)).toHaveLength(1);
    expect(assessSeries({ bars, source: 'x', currency: 'MYR', now: NOW }).status).toBe('incomplete');
  });
  it('labels synthetic data demo', () => {
    const q = assessSeries({ bars: weekdays('2025-11-03', 10), source: 'gen', currency: 'MYR', now: NOW, synthetic: true });
    expect(q.status).toBe('demo');
  });
  it('is unavailable with no bars', () => {
    expect(assessSeries({ bars: [], source: 'x', currency: 'MYR', now: NOW }).status).toBe('unavailable');
  });
});

describe('detectFrequency', () => {
  it('detects weekly series', () => {
    const bars: Bar[] = ['2025-01-03', '2025-01-10', '2025-01-17', '2025-01-24'].map((t) => ({ t, o: 1, h: 1, l: 1, c: 1, v: null }));
    expect(detectFrequency(bars)).toBe('weekly');
  });
});
