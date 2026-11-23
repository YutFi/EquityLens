import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { MarketRow } from '../analytics/market';
import { squarify } from '../analytics/treemap';
import { arrow, fmtPct } from '../core/format';

/** Maps a % change to a background colour. Intensity saturates at +/-5%. The tile text always repeats the sign and arrow. */
function tileColour(pct: number | null): string {
  if (pct == null) return '#4a5360';
  const t = Math.min(Math.abs(pct) / 5, 1);
  const alpha = 0.45 + 0.5 * t;
  return pct >= 0 ? `rgba(24, 140, 84, ${alpha})` : `rgba(196, 52, 48, ${alpha})`;
}

/**
 * Tile area is proportional to latest traded value (close x volume), NOT market capitalisation,
 * because no verified market-cap source is available.
 */
export function Heatmap({ rows }: { rows: MarketRow[] }) {
  const tiles = useMemo(
    () => squarify(rows.filter((r) => r.tradedValue && r.tradedValue > 0).map((r) => ({ item: r, value: r.tradedValue as number })), 1000, 360),
    [rows],
  );
  if (tiles.length === 0) return <p className="muted">No securities with volume data to size tiles by.</p>;
  return (
    <div className="heatmap" role="list" aria-label="Heatmap of one-day change, sized by traded value">
      {tiles.map(({ item: r, x, y, w, h }) => (
        <Link
          key={r.security.id}
          role="listitem"
          to={`/company/${encodeURIComponent(r.security.id)}`}
          className="tile"
          title={`${r.security.name}: ${fmtPct(r.changePct)} on ${r.asOf}`}
          style={{ left: `${(x / 1000) * 100}%`, top: `${(y / 360) * 100}%`, width: `${(w / 1000) * 100}%`, height: `${(h / 360) * 100}%`, background: tileColour(r.changePct) }}
        >
          <b>{r.security.code}</b>
          {w > 60 && h > 36 && <span>{arrow(r.changePct)} {fmtPct(r.changePct)}</span>}
        </Link>
      ))}
    </div>
  );
}
