import type { DataQuality, DataStatus } from '../core/types';
import { fmtDateTime } from '../core/format';

const LABEL: Record<DataStatus, string> = {
  verified: 'Verified', delayed: 'Delayed', historical: 'Historical', estimated: 'Estimated',
  incomplete: 'Incomplete', stale: 'Stale', unavailable: 'Unavailable', demo: 'Synthetic demo',
};
const GLYPH: Record<DataStatus, string> = {
  verified: '✓', delayed: '◔', historical: '▤', estimated: '≈', incomplete: '!', stale: '⌛', unavailable: '∅', demo: '⚠',
};

export function QualityBadge({ quality, status }: { quality?: DataQuality | null; status?: DataStatus }) {
  const s: DataStatus = status ?? quality?.status ?? 'unavailable';
  const title = quality
    ? `${LABEL[s]} · ${quality.source}${quality.observationDate ? ` · as of ${quality.observationDate}` : ''}`
    : LABEL[s];
  return (
    <span className={`badge ${s}`} title={title}>
      <span aria-hidden="true">{GLYPH[s]}</span>
      {LABEL[s]}
    </span>
  );
}

/** Full data-quality record: source, timestamps, currency, period, frequency, status. */
export function QualityPanel({ quality }: { quality: DataQuality }) {
  return (
    <dl className="kv">
      <dt>Source</dt><dd>{quality.source}</dd>
      <dt>Status</dt><dd><QualityBadge quality={quality} /></dd>
      <dt>Observation date</dt><dd className="num">{quality.observationDate ?? '–'}</dd>
      <dt>Loaded into browser</dt><dd className="num">{fmtDateTime(quality.lastUpdated)}</dd>
      <dt>Currency</dt><dd>{quality.currency}</dd>
      <dt>Coverage period</dt><dd className="num">{quality.reportingPeriod ?? '–'}</dd>
      <dt>Frequency</dt><dd>{quality.frequency ?? '–'}</dd>
      {quality.notes.length > 0 && (
        <>
          <dt>Notes</dt>
          <dd><ul className="plain">{quality.notes.map((n) => <li key={n}>{n}</li>)}</ul></dd>
        </>
      )}
    </dl>
  );
}
