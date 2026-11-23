export interface NavItem {
  path: string;
  label: string;
  /** 'live' pages work today. 'planned' pages are honest placeholders for a later roadmap phase. */
  status: 'live' | 'planned';
  phase?: number | null;
  scope?: string[];
}

export const NAV: NavItem[] = [
  { path: '/', label: 'Overview', status: 'live' },
  { path: '/markets', label: 'Markets', status: 'live' },
  { path: '/discover', label: 'Discover', status: 'live' },
  {
    path: '/opportunities', label: 'Opportunities', status: 'planned', phase: 5,
    scope: ['Undervalued, growth, dividend, momentum and recovery scanners', 'Financial warning signals', 'Transparent opportunity scoring with sector-aware criteria'],
  },
  {
    path: '/screener', label: 'Stock Screener', status: 'planned', phase: 5,
    scope: ['Filters on price, market cap, P/E, P/B, growth, yield, debt and momentum', 'Sortable results with data-availability status'],
  },
  { path: '/company', label: 'Company Research', status: 'live' },
  {
    path: '/valuation', label: 'Valuation', status: 'planned', phase: 3,
    scope: ['Discounted cash flow, relative valuation and dividend discount model', 'Conservative / base / optimistic scenarios with adjustable assumptions', 'Banking-specific valuation methods'],
  },
  {
    path: '/forecasting', label: 'Forecasting', status: 'planned', phase: 4,
    scope: ['Transparent statistical forecasts (regression, smoothing, ARIMA, ensembles)', 'Walk-forward backtesting with MAE, RMSE, directional accuracy and interval coverage', 'Bullish / base / bearish scenarios with uncertainty bands'],
  },
  {
    path: '/comparison', label: 'Comparison', status: 'planned', phase: 6,
    scope: ['Compare up to five companies on fundamentals, returns, risk and momentum'],
  },
  {
    path: '/sectors', label: 'Sector Intelligence', status: 'planned', phase: null,
    scope: ['Sector performance, profitability and valuation dashboards', 'Not yet assigned to a roadmap phase'],
  },
  {
    path: '/simulator', label: 'Investment Simulator', status: 'planned', phase: 6,
    scope: ['Hypothetical, local-only portfolios with average cost and unrealised profit/loss'],
  },
  {
    path: '/watchlist', label: 'Watchlist', status: 'planned', phase: 6,
    scope: ['Local-first watchlists and optional browser-notification alerts'],
  },
  { path: '/methodology', label: 'Methodology', status: 'live' },
  { path: '/data-sources', label: 'Data Sources', status: 'live' },
  { path: '/settings', label: 'Settings', status: 'live' },
];
