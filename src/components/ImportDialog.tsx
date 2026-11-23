import { useEffect, useMemo, useRef, useState } from 'react';
import type { PriceSeries, Security } from '../core/types';
import { MARKETS } from '../core/markets';
import { parseOhlcCsv, type DateOrder } from '../data/csv';
import { assessSeries } from '../data/quality';
import { useApp } from '../state/AppContext';
import { QualityBadge } from './QualityBadge';

const MAX_BYTES = 15 * 1024 * 1024;

/** Import an end-of-day OHLCV CSV for one security. Everything is parsed and stored locally. */
export function ImportDialog({ onClose, presetSecurityId }: { onClose: () => void; presetSecurityId?: string }) {
  const app = useApp();
  const market = MARKETS[app.state.settings.market];
  const candidates = useMemo(
    () => app.securities.filter((s) => s.market === market.id && s.origin !== 'demo'),
    [app.securities, market.id],
  );
  const [targetId, setTargetId] = useState(presetSecurityId ?? candidates.find((s) => s.benchmark)?.id ?? candidates[0]?.id ?? '__new');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<'equity' | 'index'>('equity');
  const [order, setOrder] = useState<DateOrder>('ISO');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('pasted text');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const parsed = useMemo(() => (text.trim() ? parseOhlcCsv(text, order) : null), [text, order]);
  const existing = app.state.seriesById[targetId];

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > MAX_BYTES) { setError(`That file is ${(f.size / 1048576).toFixed(1)} MB; the limit is 15 MB.`); return; }
    setError(null);
    setFileName(f.name);
    setText(await f.text());
  }

  async function submit() {
    if (!parsed || parsed.fatal || parsed.bars.length === 0) return;
    let security: Security | undefined = candidates.find((s) => s.id === targetId);
    if (targetId === '__new') {
      const code = newCode.trim().toUpperCase();
      if (!/^[A-Z0-9^.\-]{1,12}$/.test(code)) { setError('Enter a code of 1 to 12 letters, digits, ^, . or -.'); return; }
      if (!newName.trim()) { setError('Enter a company or index name.'); return; }
      security = { id: `${market.id}:${code}`, market: market.id, code, name: newName.trim(), kind: newKind, currency: market.currency, origin: 'import', benchmark: false };
    }
    if (!security) { setError('Choose a security.'); return; }
    // Importing over a seed-directory entry promotes it to a user-owned record (keeps benchmark flag and sector).
    const sec: Security = { ...security, origin: security.origin === 'seed' ? 'import' : security.origin };
    setBusy(true);
    const quality = assessSeries({
      bars: parsed.bars, source: `User import: ${fileName}`, currency: sec.currency,
      rejectedRows: parsed.errorCount, duplicatesRemoved: parsed.duplicatesRemoved,
    });
    const series: PriceSeries = { securityId: sec.id, bars: parsed.bars, quality, adjustedAvailable: parsed.hasAdjClose };
    await app.importSeries(sec, series);
    setBusy(false);
    onClose();
  }

  const preview = parsed && !parsed.fatal
    ? assessSeries({ bars: parsed.bars, source: fileName, currency: market.currency, rejectedRows: parsed.errorCount, duplicatesRemoved: parsed.duplicatesRemoved })
    : null;

  return (
    <div className="dialog-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="imp-title">
        <h2 id="imp-title">Import price history (CSV)</h2>
        <p className="muted">
          Parsed in your browser and stored only on this device. Use an export you are entitled to use. Needs Date, Open, High, Low and Close columns; Volume and Adj Close are optional.
        </p>
        <div className="stack">
          <label className="field">Security
            <select ref={firstRef} className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              {candidates.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
              <option value="__new">Add a security not in the list…</option>
            </select>
          </label>
          {targetId === '__new' && (
            <div className="row">
              <label className="field" style={{ width: 130 }}>Code
                <input className="input" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. 5296" />
              </label>
              <label className="field" style={{ flex: 1, minWidth: 180 }}>Name
                <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Company or index name" />
              </label>
              <label className="field">Type
                <select className="input" value={newKind} onChange={(e) => setNewKind(e.target.value as 'equity' | 'index')}>
                  <option value="equity">Company</option><option value="index">Index</option>
                </select>
              </label>
            </div>
          )}
          <div className="row">
            <label className="field">CSV file
              <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => void onFile(e.target.files?.[0])} />
            </label>
            <label className="field">Date format in file
              <select className="input" value={order} onChange={(e) => setOrder(e.target.value as DateOrder)}>
                <option value="ISO">YYYY-MM-DD (recommended)</option>
                <option value="DMY">DD/MM/YYYY</option>
                <option value="MDY">MM/DD/YYYY</option>
              </select>
            </label>
          </div>
          <label className="field">…or paste CSV text
            <textarea className="input" value={text} onChange={(e) => { setText(e.target.value); setFileName('pasted text'); }} placeholder={'Date,Open,High,Low,Close,Volume\n2025-11-20,9.80,9.95,9.78,9.90,1200000'} />
          </label>

          {parsed?.fatal && <div className="banner err" role="alert">{parsed.fatal}</div>}
          {parsed && !parsed.fatal && preview && (
            <div className="banner info" aria-live="polite">
              <b>{parsed.bars.length} valid rows</b> of {parsed.rowsRead} · {preview.reportingPeriod} · <QualityBadge quality={preview} />
              {parsed.errorCount > 0 && <div className="neg">{parsed.errorCount} row(s) rejected. First issues: {parsed.errors.slice(0, 3).join(' | ')}</div>}
              {parsed.duplicatesRemoved > 0 && <div>{parsed.duplicatesRemoved} duplicate date(s) will be merged (last kept).</div>}
              {parsed.warningCount > 0 && <div>{parsed.warningCount} row(s) have a high/low that does not bracket open/close; kept as supplied.</div>}
              <div>Adjusted close: {parsed.hasAdjClose ? 'present' : 'not present'} · Volume: {parsed.hasVolume ? 'present' : 'not present'}</div>
              {existing && <div className="muted">This replaces the {existing.bars.length} bars already stored for this security.</div>}
            </div>
          )}
          {error && <div className="banner err" role="alert">{error}</div>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" type="button" onClick={onClose}>Cancel</button>
            <button className="btn primary" type="button" disabled={busy || !parsed || !!parsed.fatal || parsed.bars.length === 0} onClick={() => void submit()}>
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
