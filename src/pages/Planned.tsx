import { Link, useLocation } from 'react-router-dom';
import { Page } from '../components/Layout';
import { NAV } from '../nav';

/** Honest placeholder. A planned page never shows mock data and never pretends to work. */
export function Planned() {
  const { pathname } = useLocation();
  const item = NAV.find((n) => n.path === pathname);
  return (
    <Page title={item?.label ?? 'Planned feature'} subtitle={item?.phase ? `Planned for Phase ${item.phase}` : 'Planned; not yet assigned to a phase'}>
      <div className="panel">
        <div className="banner warn"><b>Not built yet.</b>This page is a placeholder. No feature here works, and no data is shown.</div>
        {item?.scope && (
          <>
            <h2 style={{ marginBottom: 8 }}>Planned scope</h2>
            <ul className="plain">{item.scope.map((s) => <li key={s}>{s}</li>)}</ul>
          </>
        )}
        <p className="muted" style={{ marginTop: 12 }}>The roadmap is in <code>PROJECT_SPEC.md</code>. A feature is only marked complete after it is built and tested. <Link to="/">Back to Overview</Link></p>
      </div>
    </Page>
  );
}
