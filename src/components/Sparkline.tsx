import { useId } from 'react';

interface Props {
  values: number[];
  width?: number;
  height?: number;
  /** Fill the area under the line with a soft gradient. */
  area?: boolean;
}

/**
 * Tiny trend line built only from the values passed in. Decorative (the numbers are always shown
 * elsewhere), so it is hidden from assistive technology. Colour follows first-to-last direction;
 * it is never the only cue because the adjacent figures carry a sign and arrow.
 */
export function Sparkline({ values, width = 96, height = 28, area = false }: Props) {
  const gid = useId();
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2) return <span className="muted" aria-hidden="true">–</span>;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const span = max - min || 1;
  const pad = 2;
  const pts = v.map((y, i) => [pad + (i / (v.length - 1)) * (width - pad * 2), pad + (1 - (y - min) / span) * (height - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const up = v[v.length - 1] >= v[0];
  const colour = up ? 'var(--pos)' : 'var(--neg)';
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
      {area && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colour} stopOpacity="0.28" />
              <stop offset="1" stopColor={colour} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${pts[pts.length - 1][0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height} Z`} fill={`url(#${gid})`} />
        </>
      )}
      <path d={line} fill="none" stroke={colour} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={colour} />
    </svg>
  );
}
