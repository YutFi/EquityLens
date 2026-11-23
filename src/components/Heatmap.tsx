import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { MarketRow } from '../analytics/market';
import { squarify } from '../analytics/treemap';
import { arrow, fmtPct } from '../core/format';

/** Maps a % change to a background colour. Intensity saturates at +/-5%. The tile text always repeats the sign and arrow. */
function tileColour(pct: number | null): string {
  if (pct == null) return 'linear-gradient(160deg, #475066, #384055)';
  const t = Math.min(Math.abs(pct) / 5, 1);
  // Greens and reds share lightness so neither looks "louder"; saturation and depth carry magnitude.
  const l1 = 30 + 12 * t;
  const l2 = 22 + 10 * t;
  return pct >= 0
    ? `linear-gradient(160deg, hsl(158 62% ${l1}%), hsl(164 66% ${l2}%))`
    : `linear-gradient(160deg, hsl(352 66% ${l1 + 4}%), hsl(346 62% ${l2 + 4}%))`;
}

/**
 * Tile area is proportional to latest traded value (close x volume), NOT market capitalisation,
 * because no verified market-cap source is available.
 */
export function Heatmap({ rows }: { rows: MarketRow[] }) {
  const tiles = useMemo(
    () => squarify(rows.filter((r) => r.tradedValue && r.tradedValue > 0).map((r) => ({ item: r, value: r.tradedValue as number })), 1000, 380),
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
          style={{ left: `${(x / 1000) * 100}%`, top: `${(y / 380) * 100}%`, width: `${(w / 1000) * 100}%`, height: `${(h / 380) * 100}%`, background: tileColour(r.changePct) }}
        >
          <b>{r.security.code}</b>
          {w > 60 && h > 36 && <span>{arrow(r.changePct)} {fmtPct(r.changePct)}</span>}
        </Link>
      ))}
    </div>
  );
}
