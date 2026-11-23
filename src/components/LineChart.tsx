import { useMemo, useState } from 'react';

export interface LinePoint { t: string; v: number }
export interface LineSeries {
  name: string;
  points: LinePoint[];
  /** CSS colour or variable. */
  color: string;
  dashed?: boolean;
  width?: number;
}
export interface Band { name: string; upper: LinePoint[]; lower: LinePoint[]; color: string }

interface Props {
  series: LineSeries[];
  bands?: Band[];
  height?: number;
  /** Text read by assistive technology. */
  label: string;
  format?: (v: number) => string;
  /** Draw a horizontal reference line (for example 100 for a rebased chart). */
  refLine?: number;
  /** Date at which the forecast starts: draws a vertical divider. */
  dividerAt?: string;
}

const PAD = { l: 52, r: 14, t: 10, b: 24 };

/**
 * Small dependency-free SVG line chart. It draws exactly the points it is given, supports
 * dashed forecast lines and shaded uncertainty bands, and prints values on hover so colour is
 * never the only cue.
 */
export function LineChart({ series, bands = [], height = 280, label, format = (v) => v.toFixed(2), refLine, dividerAt }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 900;
  const H = height;

  const dates = useMemo(() => {
    const set = new Set<string>();
    for (const s of series) for (const p of s.points) set.add(p.t);
    for (const b of bands) for (const p of [...b.upper, ...b.lower]) set.add(p.t);
    return [...set].sort();
  }, [series, bands]);

  const { minV, maxV } = useMemo(() => {
    let lo = Infinity; let hi = -Infinity;
    for (const s of series) for (const p of s.points) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v); }
    for (const b of bands) for (const p of [...b.upper, ...b.lower]) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v); }
    if (refLine != null) { lo = Math.min(lo, refLine); hi = Math.max(hi, refLine); }
    if (!Number.isFinite(lo)) return { minV: 0, maxV: 1 };
    const pad = (hi - lo) * 0.06 || Math.abs(hi) * 0.05 || 1;
    return { minV: lo - pad, maxV: hi + pad };
  }, [series, bands, refLine]);

  if (dates.length < 2) return <div className="muted">Not enough points to draw a chart.</div>;

  const idx = new Map(dates.map((d, i) => [d, i]));
  const x = (t: string) => PAD.l + ((idx.get(t) ?? 0) / (dates.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - minV) / (maxV - minV)) * (H - PAD.t - PAD.b);
  const path = (pts: LinePoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const bandPath = (b: Band) => `${path(b.upper)} ${[...b.lower].reverse().map((p) => `L${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} Z`;

  const ticks = Array.from({ length: 5 }, (_, i) => minV + ((maxV - minV) * i) / 4);
  const xTicks = [0, Math.floor((dates.length - 1) / 2), dates.length - 1];
  const hoverDate = hover != null ? dates[hover] : null;
  const valueAt = (s: LineSeries | { points: LinePoint[] }, d: string) => s.points.find((p) => p.t === d)?.v ?? null;

  return (
    <div>
      <div className="chart-legend-row" aria-hidden="true">
        {series.map((s) => (
          <span key={s.name} className="legend-item">
            <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? '5 3' : undefined} /></svg>
            {s.name}
          </span>
        ))}
        {bands.map((b) => (
          <span key={b.name} className="legend-item"><svg width="22" height="10"><rect width="22" height="10" fill={b.color} opacity="0.3" /></svg>{b.name}</span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}
        style={{ display: 'block', touchAction: 'pan-y' }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (dates.length - 1));
          setHover(i >= 0 && i < dates.length ? i : null);
        }}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--border)" />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{format(v)}</text>
          </g>
        ))}
        {xTicks.map((i) => <text key={i} x={x(dates[i])} y={H - 6} textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'} fontSize="11" fill="var(--muted)">{dates[i]}</text>)}
        {refLine != null && <line x1={PAD.l} x2={W - PAD.r} y1={y(refLine)} y2={y(refLine)} stroke="var(--border-strong)" strokeDasharray="2 4" />}
        {dividerAt && idx.has(dividerAt) && <line x1={x(dividerAt)} x2={x(dividerAt)} y1={PAD.t} y2={H - PAD.b} stroke="var(--border-strong)" strokeDasharray="3 3" />}
        {bands.map((b) => <path key={b.name} d={bandPath(b)} fill={b.color} opacity="0.22" />)}
        {series.map((s) => (
          <path key={s.name} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dashed ? '6 4' : undefined} strokeLinejoin="round" />
        ))}
        {hoverDate && <line x1={x(hoverDate)} x2={x(hoverDate)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text-dim)" strokeOpacity="0.5" />}
      </svg>
      <div className="chart-readout" aria-live="off">
        {hoverDate
          ? <><b className="num">{hoverDate}</b>{series.map((s) => { const v = valueAt(s, hoverDate); return v == null ? null : <span key={s.name} className="num"> · {s.name}: {format(v)}</span>; })}{bands.map((b) => { const u = valueAt({ points: b.upper }, hoverDate); const l = valueAt({ points: b.lower }, hoverDate); return u != null && l != null ? <span key={b.name} className="num"> · {b.name}: {format(l)} to {format(u)}</span> : null; })}</>
          : <span className="muted">Hover the chart to read exact values.</span>}
      </div>
    </div>
  );
}
