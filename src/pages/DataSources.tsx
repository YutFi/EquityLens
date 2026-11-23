import { CATALOG_REVIEWED, PROVIDER_CATALOG, type ProviderDoc } from '../data/providerCatalog';
import { PROVIDERS } from '../data/providers/registry';
import { Page } from '../components/Layout';
import { QualityBadge } from '../components/QualityBadge';
import { useApp } from '../state/AppContext';

const FIELDS: [keyof ProviderDoc, string][] = [
  ['availableData', 'Available data'], ['coverage', 'Coverage'], ['updateFrequency', 'Update frequency'],
  ['realtimeOrDelayed', 'Real-time / delayed'], ['apiKey', 'API key'], ['rateLimits', 'Rate limits'],
  ['licensing', 'Licensing'], ['redistribution', 'Redistribution'], ['browserAccess', 'Browser access'], ['reliability', 'Reliability'],
];
const STATE_LABEL: Record<ProviderDoc['state'], string> = { integrated: 'Integrated', 'not-integrated': 'Not integrated', planned: 'Planned' };

export function DataSources() {
  const app = useApp();
  const inventory = Object.values(app.state.seriesById);
  const nameOf = (id: string) => app.securities.find((s) => s.id === id);
  return (
    <Page title="Data Sources" subtitle={`Where data comes from, what was investigated, and why. Reviewed ${CATALOG_REVIEWED}.`}>
      <div className="stack">
        <div className="banner warn">
          <b>Honest status of live data.</b>
          No free, legitimate, browser-accessible live feed for Bursa Malaysia prices was found that works from a static GitHub Pages site without an API key, a paid proxy or a backend. Rather than scrape an unlicensed source or fake it, Phase 1 runs on files you import. Live providers can be added as adapters without changing any page.
        </div>

        <section className="panel" aria-label="Registered providers">
          <header><h2>Active providers in this build</h2></header>
          <ul className="plain">{PROVIDERS.map((p) => <li key={p.id}><b>{p.name}</b> <span className="muted">({p.id})</span></li>)}</ul>
        </section>

        <section className="panel" aria-label="Local data inventory">
          <header><h2>Data currently in this browser</h2></header>
          {inventory.length === 0 ? <p className="muted">Nothing loaded.</p> : (
            <div className="table-wrap">
              <table className="t">
                <caption className="sr-only">Loaded series</caption>
                <thead><tr><th>Security</th><th>Status</th><th>Source</th><th>Observation date</th><th>Coverage</th><th className="r">Bars</th></tr></thead>
                <tbody>
                  {inventory.map((s) => (
                    <tr key={s.securityId}>
                      <td><b className="num">{nameOf(s.securityId)?.code ?? s.securityId}</b></td>
                      <td><QualityBadge quality={s.quality} /></td>
                      <td className="wrap">{s.quality.source}</td>
                      <td className="num">{s.quality.observationDate ?? '–'}</td>
                      <td className="num">{s.quality.reportingPeriod ?? '–'}</td>
                      <td className="r num">{s.bars.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="stack" aria-label="Provider investigation">
          <h2>Providers investigated</h2>
          {PROVIDER_CATALOG.map((p) => (
            <details key={p.id} className="panel" open={p.state === 'integrated'}>
              <summary style={{ cursor: 'pointer' }}>
                <b>{p.name}</b> <span className={`badge ${p.state === 'integrated' ? 'historical' : 'unavailable'}`}>{STATE_LABEL[p.state]}</span>
                <span className="dim"> · {p.headline}</span>
              </summary>
              <dl className="kv" style={{ marginTop: 10 }}>
                {FIELDS.map(([k, label]) => <><dt key={`${p.id}-${k}-t`}>{label}</dt><dd key={`${p.id}-${k}-d`}>{p[k]}</dd></>)}
              </dl>
            </details>
          ))}
        </section>

        <section className="panel" aria-label="Credits">
          <header><h2>Third-party software</h2></header>
          <ul className="plain">
            <li><a href="https://github.com/tradingview/lightweight-charts" target="_blank" rel="noreferrer noopener">TradingView Lightweight Charts™</a> (Apache-2.0): price charts, with its attribution logo displayed.</li>
            <li>React, React Router, idb-keyval (MIT).</li>
          </ul>
        </section>
      </div>
    </Page>
  );
}
