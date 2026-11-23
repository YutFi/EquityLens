import { Page } from '../components/Layout';
import { MARKET_LIST } from '../core/markets';
import { getMarketStatus } from '../core/marketStatus';
import { useApp } from '../state/AppContext';

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function Markets() {
  const app = useApp();
  return (
    <Page title="Markets" subtitle="Each exchange has its own configuration: currency, time zone, sessions and identifiers. Nothing assumes every market looks like Bursa Malaysia.">
      <div className="grid cols-2">
        {MARKET_LIST.map((m) => {
          const active = m.id === app.state.settings.market;
          const status = getMarketStatus(m);
          const loaded = app.securities.filter((s) => s.market === m.id && app.state.seriesById[s.id]).length;
          return (
            <section key={m.id} className="panel" aria-label={m.name}>
              <header>
                <h2>{m.name}</h2>
                {m.status === 'planned' ? <span className="badge unavailable">Planned · Phase {m.plannedPhase}</span> : active ? <span className="badge historical">Selected</span> : (
                  <button type="button" className="btn small" onClick={() => app.setSettings({ market: m.id })}>Select</button>
                )}
              </header>
              <dl className="kv">
                <dt>Currency</dt><dd>{m.currencyLabel} ({m.currency})</dd>
                <dt>Time zone</dt><dd>{m.timezone}</dd>
                <dt>Standard sessions</dt><dd className="num">{m.sessions.map((s) => `${hhmm(s.open)}–${hhmm(s.close)}`).join(', ')}</dd>
                <dt>Local status</dt><dd>{status.label} ({status.localTime})</dd>
                <dt>Identifier</dt><dd>{m.identifierNote}</dd>
                <dt>Benchmark</dt><dd>{m.benchmarkName}</dd>
                {m.status === 'active' && <><dt>Securities with data</dt><dd className="num">{loaded}</dd></>}
              </dl>
              <p className="evidence" style={{ marginTop: 8 }}>{m.caveat}</p>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
