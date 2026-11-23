import { describePriceHistory } from './describe';
import type { Bar } from '../core/types';

const bar = (t: string, c: number): Bar => ({ t, o: c, h: c, l: c, c, v: 1000, adj: null });

describe('describePriceHistory', () => {
  it('refuses to describe fewer than two bars', () => {
    expect(describePriceHistory([bar('2026-01-02', 1)], 'MYR')).toHaveLength(1);
    expect(describePriceHistory([], 'MYR')[0]).toMatch(/not enough/i);
  });

  it('reports the move, extremes and biggest days, and disclaims prediction', () => {
    const lines = describePriceHistory(
      [bar('2026-01-02', 1), bar('2026-01-05', 1.1), bar('2026-01-06', 0.99), bar('2026-01-07', 1.2)],
      'MYR',
    );
    const text = lines.join(' ');
    expect(text).toContain('2026-01-02 to 2026-01-07');
    expect(text).toContain('+20.00%');
    expect(text).toMatch(/highest close/);
    expect(text).toMatch(/largest one-day rise/);
    expect(text).toMatch(/does not predict/);
  });
});
