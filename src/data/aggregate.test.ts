import type { Bar } from '../core/types';
import { aggregateBars, applyAdjustment, sliceRange } from './aggregate';

const b = (t: string, o: number, h: number, l: number, c: number, v: number | null = 100, adj: number | null = null): Bar => ({ t, o, h, l, c, v, adj });

describe('aggregateBars', () => {
  const daily = [
    b('2025-01-06', 10, 11, 9, 10.5, 100), // Mon
    b('2025-01-07', 10.5, 12, 10, 11, 200),
    b('2025-01-10', 11, 11.5, 10.8, 11.2, 50), // Fri
    b('2025-01-13', 11.2, 13, 11, 12.5, 400), // next Mon
  ];
  it('builds weekly bars: first open, extreme high/low, last close, summed volume', () => {
    const w = aggregateBars(daily, 'weekly');
    expect(w).toHaveLength(2);
    expect(w[0]).toMatchObject({ t: '2025-01-10', o: 10, h: 12, l: 9, c: 11.2, v: 350 });
    expect(w[1]).toMatchObject({ t: '2025-01-13', o: 11.2, c: 12.5, v: 400 });
  });
  it('builds monthly bars', () => {
    const m = aggregateBars(daily, 'monthly');
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ o: 10, h: 13, l: 9, c: 12.5, v: 750 });
  });
  it('keeps volume null when no bar has volume', () => {
    expect(aggregateBars([b('2025-01-06', 1, 2, 1, 1.5, null), b('2025-01-07', 1, 2, 1, 1.6, null)], 'weekly')[0].v).toBeNull();
  });
  it('returns daily bars unchanged', () => {
    expect(aggregateBars(daily, 'daily')).toBe(daily);
  });
});

describe('sliceRange', () => {
  it('anchors the window on the last bar, not on today', () => {
    const bars = [b('2020-01-01', 1, 1, 1, 1), b('2020-06-01', 1, 1, 1, 1), b('2020-06-30', 1, 1, 1, 1)];
    expect(sliceRange(bars, '1M').map((x) => x.t)).toEqual(['2020-06-01', '2020-06-30']);
    expect(sliceRange(bars, 'MAX')).toHaveLength(3);
  });
});

describe('applyAdjustment', () => {
  it('scales OHLC by adjClose/close', () => {
    const [x] = applyAdjustment([b('2025-01-02', 10, 12, 8, 10, 1, 5)]);
    expect(x).toMatchObject({ o: 5, h: 6, l: 4, c: 5 });
  });
  it('leaves bars without adjusted close untouched', () => {
    const orig = b('2025-01-02', 10, 12, 8, 10);
    expect(applyAdjustment([orig])[0]).toEqual(orig);
  });
});
