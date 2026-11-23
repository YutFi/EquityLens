import { parseDate, parseOhlcCsv } from './csv';

const YAHOO = `Date,Open,High,Low,Close,Adj Close,Volume
2025-11-18,9.80,9.95,9.78,9.90,9.55,1200000
2025-11-19,9.90,10.05,9.88,10.00,9.65,1500000
2025-11-20,10.00,10.10,9.95,9.97,9.62,900000
`;

describe('parseOhlcCsv', () => {
  it('parses a Yahoo-style export with adjusted close and volume', () => {
    const r = parseOhlcCsv(YAHOO);
    expect(r.fatal).toBeNull();
    expect(r.bars).toHaveLength(3);
    expect(r.bars[0]).toMatchObject({ t: '2025-11-18', o: 9.8, h: 9.95, l: 9.78, c: 9.9, v: 1_200_000, adj: 9.55 });
    expect(r.hasAdjClose).toBe(true);
    expect(r.hasVolume).toBe(true);
    expect(r.errorCount).toBe(0);
  });

  it('parses Stooq-style files without adjusted close and sorts ascending', () => {
    const r = parseOhlcCsv('Date,Open,High,Low,Close,Volume\n2025-01-03,2,2.2,1.9,2.1,100\n2025-01-02,1.9,2.1,1.8,2.0,90\n');
    expect(r.bars.map((b) => b.t)).toEqual(['2025-01-02', '2025-01-03']);
    expect(r.hasAdjClose).toBe(false);
  });

  it('rejects bad rows without inventing values and counts them', () => {
    const r = parseOhlcCsv('Date,Open,High,Low,Close\n2025-01-02,1,2,0.5,1.5\n2025-01-03,abc,2,1,1.5\n2025-01-04,1,0.5,2,1\nnot-a-date,1,2,1,1\n');
    expect(r.bars).toHaveLength(1);
    expect(r.errorCount).toBe(3);
    expect(r.errors[0]).toContain('Line 3');
  });

  it('keeps the last row when a date is duplicated and reports it', () => {
    const r = parseOhlcCsv('Date,Open,High,Low,Close\n2025-01-02,1,2,1,1.5\n2025-01-02,1,2,1,1.7\n');
    expect(r.bars).toHaveLength(1);
    expect(r.bars[0].c).toBe(1.7);
    expect(r.duplicatesRemoved).toBe(1);
  });

  it('reports missing required columns', () => {
    const r = parseOhlcCsv('Date,Close\n2025-01-02,1\n');
    expect(r.fatal).toMatch(/Missing required column/);
  });

  it('does not guess ambiguous DD/MM dates in ISO mode but reads them in DMY mode', () => {
    const csv = 'Date,Open,High,Low,Close\n21/11/2025,1,2,1,1.5\n';
    const iso = parseOhlcCsv(csv, 'ISO');
    expect(iso.bars).toHaveLength(0);
    expect(iso.fatal).toMatch(/DD\/MM\/YYYY/);
    expect(parseOhlcCsv(csv, 'DMY').bars[0].t).toBe('2025-11-21');
  });

  it('handles quoted thousands separators, semicolons and BOM', () => {
    const r = parseOhlcCsv('﻿Date;Open;High;Low;Close;Volume\n2025-01-02;1;2;1;1.5;"1,200,000"\n');
    expect(r.delimiter).toBe(';');
    expect(r.bars[0].v).toBe(1_200_000);
  });

  it('flags suspicious but non-fatal rows as warnings', () => {
    const r = parseOhlcCsv('Date,Open,High,Low,Close\n2025-01-02,1.0,1.1,0.9,1.2\n');
    expect(r.bars).toHaveLength(1);
    expect(r.warningCount).toBe(1);
  });
});

describe('parseDate', () => {
  it('rejects impossible dates', () => {
    expect(parseDate('2025-02-30', 'ISO')).toBeNull();
    expect(parseDate('31/04/2025', 'DMY')).toBeNull();
    expect(parseDate('2024-02-29', 'ISO')).toBe('2024-02-29');
  });
  it('ignores a time suffix', () => {
    expect(parseDate('2025-01-02 00:00:00', 'ISO')).toBe('2025-01-02');
  });
});
