import type { MarketView } from './market';
import { fmtPct } from '../core/format';

export interface Insight {
  text: string;
  /** The observed numbers the sentence is built from. */
  evidence: string[];
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Rule-based, data-supported market summary. It only describes what the loaded data shows
 * (price changes, breadth, volume). It never states why prices moved: price moves and confirmed
 * causes are different things and no news/causality data is loaded.
 */
export function buildMarketSummary(view: MarketView): Insight[] {
  const out: Insight[] = [];
  const { rows, breadth, referenceDate, benchmark } = view;
  if (!referenceDate || rows.length === 0) return out;

  const n = breadth.total;
  if (n > 0) {
    const lean =
      breadth.advancing > breadth.declining ? 'more advanced than declined'
        : breadth.advancing < breadth.declining ? 'more declined than advanced'
          : 'advancers and decliners were equal';
    out.push({
      text: `Among the ${n} loaded securities with a prior close, ${lean} on ${referenceDate}.`,
      evidence: [`Advancing: ${breadth.advancing}`, `Declining: ${breadth.declining}`, `Unchanged: ${breadth.unchanged}`],
    });
  }

  const med = median(rows.map((r) => r.changePct).filter((x): x is number => x != null));
  if (med != null) {
    out.push({
      text: `The median one-day change across loaded securities was ${fmtPct(med)}.`,
      evidence: [`Securities included: ${rows.length}`, `As of ${referenceDate}`],
    });
  }

  if (benchmark?.changePct != null) {
    out.push({
      text: `The benchmark index changed ${fmtPct(benchmark.changePct)} on ${benchmark.asOf}.`,
      evidence: [`Index: ${benchmark.security.name}`, `Close: ${benchmark.last.toFixed(2)}`],
    });
  }

  const heavy = rows.filter((r) => r.volumeRatio != null && r.volumeRatio >= 2);
  if (heavy.length) {
    out.push({
      text: `${heavy.length} loaded ${heavy.length === 1 ? 'security traded' : 'securities traded'} at least twice its prior 20-day average volume.`,
      evidence: heavy.slice(0, 5).map((r) => `${r.security.code}: ${(r.volumeRatio ?? 0).toFixed(1)}x`),
    });
  }
  return out;
}
