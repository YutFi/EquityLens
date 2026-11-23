import { useEffect, useMemo, useRef, useState } from 'react';
import { FIELD_LABELS, PER_SHARE_FIELDS, periodsOf, type Fundamentals, type StatementField, type StatementPeriod } from '../core/fundamentals';
import type { Security } from '../core/types';
import { CSV_TEMPLATE, parseFundamentalsCsv, UNIT_FACTOR, type AmountUnit } from '../data/fundamentalsCsv';
import { useApp } from '../state/AppContext';

const FORM_FIELDS: StatementField[] = [
  'revenue', 'costOfRevenue', 'operatingIncome', 'interestExpense', 'netIncome', 'eps', 'dividendsPerShare',
  'totalAssets', 'currentAssets', 'inventory', 'totalLiabilities', 'currentLiabilities', 'totalDebt', 'equity', 'cash',
  'operatingCashFlow', 'capex',
];

/**
 * Enter or import company statements by hand. Nothing here comes from a data feed: every figure is
 * what the user typed or imported, and is stored with that provenance.
 */
export function FundamentalsDialog({ security, onClose }: { security: Security; onClose: () => void }) {
  const app = useApp();
  const existing = app.state.fundamentalsById[security.id];
  const [tab, setTab] = useState<'form' | 'csv'>('form');
  const [shares, setShares] = useState(existing?.sharesOutstanding ? String(existing.sharesOutstanding) : '');
  const [isFinancial, setIsFinancial] = useState(existing?.isFinancial ?? /financ|bank|insur/i.test(security.sector ?? ''));
  const [unit, setUnit] = useState<AmountUnit>('millions');
  const [periodEnd, setPeriodEnd] = useState('');
  const [vals, setVals] = useState<Partial<Record<StatementField, string>>>({});
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('pasted text');
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const parsed = useMemo(() => (text.trim() ? parseFundamentalsCsv(text, unit) : null), [text, unit]);

  function merge(periods: StatementPeriod[], source: string) {
    const keep = (existing?.periods ?? []).filter((p) => !periods.some((n) => n.kind === p.kind && n.periodEnd === p.periodEnd));
    const sharesN = shares.trim() === '' ? null : Number(shares.replace(/,/g, ''));
    if (sharesN != null && (!Number.isFinite(sharesN) || sharesN <= 0)) { setError('Shares outstanding must be a positive number.'); return; }
    const next: Fundamentals = {
      securityId: security.id,
      currency: security.currency,
      sharesOutstanding: sharesN,
      isFinancial,
      periods: [...keep, ...periods],
      source: existing && existing.source !== source ? `${existing.source}; ${source}` : source,
      loadedAt: new Date().toISOString(),
      notes: existing?.notes ?? [],
    };
    void app.saveFundamentals(next).then(onClose);
  }

  function submitForm() {
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) { setError('Enter the period end date as YYYY-MM-DD, for example 2024-12-31.'); return; }
    const p: StatementPeriod = { periodEnd, kind: 'annual' };
    let any = false;
    for (const f of FORM_FIELDS) {
      const raw = (vals[f] ?? '').trim();
      if (raw === '') continue;
      const n = Number(raw.replace(/,/g, ''));
      if (!Number.isFinite(n)) { setError(`${FIELD_LABELS[f]} is not a number.`); return; }
      p[f] = PER_SHARE_FIELDS.includes(f) ? n : n * UNIT_FACTOR[unit];
      any = true;
    }
    if (!any) { setError('Enter at least one figure.'); return; }
    merge([p], 'Entered by you (manual entry)');
  }

  function submitCsv() {
    setError(null);
    if (!parsed || parsed.fatal) return;
    merge(parsed.periods, `Imported by you: ${fileName}`);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setError('That file is over 2 MB, which is far more than a statements file needs.'); return; }
    setError(null); setFileName(f.name); setText(await f.text());
  }

  function download() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'equitylens-statements-template.csv'; a.click(); URL.revokeObjectURL(url);
  }

  const have = existing ? periodsOf(existing, 'annual').length : 0;

  return (
    <div className="dialog-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="fund-title">
        <h2 id="fund-title">Company financials for {security.code}</h2>
        <p className="muted">
          There is no free licensed statements feed for Bursa companies, so you supply the figures from the company&apos;s published annual report or quarterly filing.
          They are stored only on this device and labelled as entered by you. Check them against the source: EquityLens cannot.
        </p>
        <div className="stack">
          <div className="row">
            <label className="field" style={{ minWidth: 190 }}>Shares outstanding (number of shares)
              <input ref={firstRef} className="input" inputMode="decimal" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="e.g. 4500000000" />
            </label>
            <label className="field">Amounts are entered in
              <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as AmountUnit)}>
                <option value="units">Full currency units</option><option value="thousands">Thousands (RM&apos;000)</option><option value="millions">Millions (RM million)</option>
              </select>
            </label>
            <label className="row" style={{ alignSelf: 'end', paddingBottom: 8 }}>
              <input type="checkbox" checked={isFinancial} onChange={(e) => setIsFinancial(e.target.checked)} />
              <span className="dim">Bank, insurer or similar financial institution</span>
            </label>
          </div>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" className="chip" aria-selected={tab === 'form'} onClick={() => setTab('form')}>Type one period</button>
            <button type="button" role="tab" className="chip" aria-selected={tab === 'csv'} onClick={() => setTab('csv')}>Import CSV (many periods)</button>
          </div>

          {tab === 'form' ? (
            <div className="stack">
              <label className="field" style={{ maxWidth: 200 }}>Annual period end (YYYY-MM-DD)
                <input className="input" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} placeholder="2024-12-31" />
              </label>
              <div className="grid cols-4">
                {FORM_FIELDS.map((f) => (
                  <label key={f} className="field">{FIELD_LABELS[f]}{PER_SHARE_FIELDS.includes(f) ? ' (RM per share)' : ''}
                    <input className="input" inputMode="decimal" value={vals[f] ?? ''} onChange={(e) => setVals({ ...vals, [f]: e.target.value })} />
                  </label>
                ))}
              </div>
              <p className="evidence">Leave a box empty when you do not have the figure; it stays missing and is never filled in for you. Capex can be entered as a positive amount. Enter losses as negative numbers.</p>
            </div>
          ) : (
            <div className="stack">
              <div className="row">
                <label className="field">CSV file<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => void onFile(e.target.files?.[0])} /></label>
                <button type="button" className="btn" onClick={download}>Download template</button>
              </div>
              <label className="field">…or paste CSV text
                <textarea className="input" value={text} onChange={(e) => { setText(e.target.value); setFileName('pasted text'); }} placeholder={'period_end,kind,revenue,net_income,eps\n2024-12-31,annual,1500,210,0.12'} />
              </label>
              {parsed?.fatal && <div className="banner err" role="alert">{parsed.fatal}</div>}
              {parsed && !parsed.fatal && (
                <div className="banner info" aria-live="polite">
                  <b>{parsed.periods.length} period(s) read.</b> Columns used: {parsed.recognisedColumns.join(', ')}.
                  {parsed.ignoredColumns.length > 0 && <div className="muted">Ignored columns: {parsed.ignoredColumns.join(', ')}</div>}
                  {parsed.errorCount > 0 && <div className="neg">{parsed.errorCount} row(s) rejected: {parsed.errors.slice(0, 3).join(' | ')}</div>}
                </div>
              )}
            </div>
          )}
          {have > 0 && <p className="muted">{have} annual period(s) are already stored. Periods with the same end date are replaced; others are kept.</p>}
          {error && <div className="banner err" role="alert">{error}</div>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" type="button" onClick={onClose}>Cancel</button>
            {tab === 'form'
              ? <button className="btn primary" type="button" onClick={submitForm}>Save period</button>
              : <button className="btn primary" type="button" disabled={!parsed || !!parsed.fatal} onClick={submitCsv}>Import {parsed && !parsed.fatal ? parsed.periods.length : ''} period(s)</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
