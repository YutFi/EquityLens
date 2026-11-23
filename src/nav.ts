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
  { path: '/opportunities', label: 'Opportunities', status: 'live' },
  { path: '/screener', label: 'Stock Screener', status: 'live' },
  { path: '/company', label: 'Company Research', status: 'live' },
  { path: '/valuation', label: 'Valuation', status: 'live' },
  { path: '/forecasting', label: 'Forecasting', status: 'live' },
  { path: '/comparison', label: 'Comparison', status: 'live' },
  { path: '/sectors', label: 'Sector Intelligence', status: 'live' },
  { path: '/simulator', label: 'Investment Simulator', status: 'live' },
  { path: '/watchlist', label: 'Watchlist', status: 'live' },
  {
    path: '/events', label: 'Events & News', status: 'planned', phase: null,
    scope: ['Company announcements, dividends and corporate actions', 'Not built: no free licensed Bursa announcement or news feed could be called from a static site, and EquityLens will not invent events or scrape unlicensed sources.'],
  },
  {
    path: '/assistant', label: 'Research Assistant', status: 'planned', phase: null,
    scope: ['A natural-language assistant over the data you have loaded', 'Not built: it needs a language-model service, which conflicts with the no-account, no-paid-API, no-backend rules. Every page already explains its own figures instead.'],
  },
  { path: '/methodology', label: 'Methodology', status: 'live' },
  { path: '/data-sources', label: 'Data Sources', status: 'live' },
  { path: '/settings', label: 'Settings', status: 'live' },
];
