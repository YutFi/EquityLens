import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AppProvider } from './state/AppContext';
import { NAV } from './nav';
import { Comparison } from './pages/Comparison';
import { CompanyIndex, CompanyPage } from './pages/Company';
import { DataSources } from './pages/DataSources';
import { Discover } from './pages/Discover';
import { Forecasting } from './pages/Forecasting';
import { Markets } from './pages/Markets';
import { Methodology } from './pages/Methodology';
import { Opportunities } from './pages/Opportunities';
import { Overview } from './pages/Overview';
import { Planned } from './pages/Planned';
import { Screener } from './pages/Screener';
import { Sectors } from './pages/Sectors';
import { Settings } from './pages/Settings';
import { Simulator } from './pages/Simulator';
import { Valuation } from './pages/Valuation';
import { Watchlist } from './pages/Watchlist';

/**
 * HashRouter on purpose: GitHub Pages is static hosting with no server-side rewrites, so
 * path-based routes would 404 on refresh or when a link is shared.
 */
export function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="markets" element={<Markets />} />
            <Route path="discover" element={<Discover />} />
            <Route path="company" element={<CompanyIndex />} />
            <Route path="company/:id" element={<CompanyPage />} />
            <Route path="opportunities" element={<Opportunities />} />
            <Route path="screener" element={<Screener />} />
            <Route path="valuation" element={<Valuation />} />
            <Route path="forecasting" element={<Forecasting />} />
            <Route path="comparison" element={<Comparison />} />
            <Route path="sectors" element={<Sectors />} />
            <Route path="simulator" element={<Simulator />} />
            <Route path="watchlist" element={<Watchlist />} />
            <Route path="methodology" element={<Methodology />} />
            <Route path="data-sources" element={<DataSources />} />
            <Route path="settings" element={<Settings />} />
            {NAV.filter((n) => n.status === 'planned').map((n) => <Route key={n.path} path={n.path.slice(1)} element={<Planned />} />)}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
