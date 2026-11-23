import type { MarketId } from './types';

export interface TradingSession {
  /** Minutes after local midnight. */
  open: number;
  close: number;
}

export interface MarketConfig {
  id: MarketId;
  name: string;
  shortName: string;
  currency: string;
  currencyLabel: string;
  timezone: string;
  /** Weekday sessions in exchange-local time. */
  sessions: TradingSession[];
  /** What identifies a company on this exchange. */
  identifierNote: string;
  benchmarkName: string;
  /** Always-visible caveat about how complete the configuration is. */
  caveat: string;
  /** 'active' markets work today; 'planned' ones are placeholders for a later phase. */
  status: 'active' | 'planned';
  plannedPhase?: number;
}

const hm = (h: number, m = 0) => h * 60 + m;

export const MARKETS: Record<MarketId, MarketConfig> = {
  XKLS: {
    id: 'XKLS',
    name: 'Bursa Malaysia (KLSE)',
    shortName: 'Bursa',
    currency: 'MYR',
    currencyLabel: 'Malaysian ringgit (RM)',
    timezone: 'Asia/Kuala_Lumpur',
    sessions: [
      { open: hm(9, 0), close: hm(12, 30) },
      { open: hm(14, 30), close: hm(17, 0) },
    ],
    identifierNote: 'Four-digit stock code (some securities carry a suffix, e.g. 5235SS).',
    benchmarkName: 'FTSE Bursa Malaysia KLCI',
    caveat:
      'Session times are a standard weekday schedule. Exchange holidays and special trading arrangements are NOT bundled, so a market can appear open on a public holiday. Verify with Bursa Malaysia.',
    status: 'active',
  },
  XNAS: {
    id: 'XNAS', name: 'NASDAQ', shortName: 'NASDAQ', currency: 'USD', currencyLabel: 'US dollar',
    timezone: 'America/New_York', sessions: [{ open: hm(9, 30), close: hm(16, 0) }],
    identifierNote: 'Ticker symbol.', benchmarkName: 'NASDAQ Composite',
    caveat: 'Planned for Phase 7.', status: 'planned', plannedPhase: 7,
  },
  XNYS: {
    id: 'XNYS', name: 'NYSE', shortName: 'NYSE', currency: 'USD', currencyLabel: 'US dollar',
    timezone: 'America/New_York', sessions: [{ open: hm(9, 30), close: hm(16, 0) }],
    identifierNote: 'Ticker symbol.', benchmarkName: 'S&P 500',
    caveat: 'Planned for Phase 7.', status: 'planned', plannedPhase: 7,
  },
  XSES: {
    id: 'XSES', name: 'Singapore Exchange (SGX)', shortName: 'SGX', currency: 'SGD', currencyLabel: 'Singapore dollar',
    timezone: 'Asia/Singapore', sessions: [{ open: hm(9, 0), close: hm(17, 0) }],
    identifierNote: 'Exchange code.', benchmarkName: 'Straits Times Index',
    caveat: 'Planned for Phase 7.', status: 'planned', plannedPhase: 7,
  },
  XHKG: {
    id: 'XHKG', name: 'Hong Kong Exchanges (HKEX)', shortName: 'HKEX', currency: 'HKD', currencyLabel: 'Hong Kong dollar',
    timezone: 'Asia/Hong_Kong', sessions: [{ open: hm(9, 30), close: hm(12, 0) }, { open: hm(13, 0), close: hm(16, 0) }],
    identifierNote: 'Numeric stock code.', benchmarkName: 'Hang Seng Index',
    caveat: 'Planned for Phase 7.', status: 'planned', plannedPhase: 7,
  },
  XLON: {
    id: 'XLON', name: 'London Stock Exchange', shortName: 'LSE', currency: 'GBP', currencyLabel: 'Pound sterling',
    timezone: 'Europe/London', sessions: [{ open: hm(8, 0), close: hm(16, 30) }],
    identifierNote: 'TIDM code.', benchmarkName: 'FTSE 100',
    caveat: 'Planned for Phase 7.', status: 'planned', plannedPhase: 7,
  },
};

export const MARKET_LIST: MarketConfig[] = Object.values(MARKETS);
export const DEFAULT_MARKET: MarketId = 'XKLS';
