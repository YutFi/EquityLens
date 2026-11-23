/** Standard internal data model. Every provider adapter must normalise into these types. */

export type MarketId = 'XKLS' | 'XNAS' | 'XNYS' | 'XSES' | 'XHKG' | 'XLON';

/**
 * Data status shown next to every dataset.
 * - verified: obtained from an authoritative source by the app and checked (no Phase 1 provider qualifies)
 * - delayed: delayed exchange/vendor data
 * - historical: imported end-of-day history, fresh enough, NOT independently verified
 * - estimated: values computed by the app, not observed
 * - incomplete: parse errors or large gaps were found
 * - stale: latest observation is old
 * - unavailable: nothing to show
 * - demo: synthetic data generated locally for UI demonstration only
 */
export type DataStatus =
  | 'verified'
  | 'delayed'
  | 'historical'
  | 'estimated'
  | 'incomplete'
  | 'stale'
  | 'unavailable'
  | 'demo';

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface DataQuality {
  source: string;
  /** ISO timestamp of when the data was loaded into this browser. */
  lastUpdated: string | null;
  /** Date (YYYY-MM-DD) of the latest observation. */
  observationDate: string | null;
  currency: string;
  /** Human-readable coverage, e.g. "2023-01-03 to 2025-11-21". */
  reportingPeriod: string | null;
  frequency: Frequency | null;
  status: DataStatus;
  notes: string[];
}

export interface Bar {
  /** Trading date, YYYY-MM-DD (exchange local date). */
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  /** Shares traded; null when the source has no volume. */
  v: number | null;
  /** Adjusted close from the source, when supplied. */
  adj?: number | null;
}

export type SecurityKind = 'equity' | 'index';
export type SecurityOrigin = 'seed' | 'import' | 'demo';

export interface Security {
  /** `${market}:${code}` */
  id: string;
  market: MarketId;
  /** Exchange-local code, e.g. 1155 for Bursa, or ^KLSE style index code. */
  code: string;
  name: string;
  kind: SecurityKind;
  sector?: string;
  industry?: string;
  currency: string;
  origin: SecurityOrigin;
  /** True for the market benchmark index used for relative performance. */
  benchmark?: boolean;
}

export interface PriceSeries {
  securityId: string;
  bars: Bar[];
  quality: DataQuality;
  /** True when every bar carries an adjusted close. */
  adjustedAvailable: boolean;
}

export type ProviderErrorCode =
  | 'unavailable'
  | 'network'
  | 'cors'
  | 'rate_limited'
  | 'parse'
  | 'not_supported';

export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ProviderErrorCode; message: string } };

export type RangeKey = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'MAX';
export type IntervalKey = 'daily' | 'weekly' | 'monthly';
export type AnalysisLevel = 'beginner' | 'advanced';
export type ThemeKey = 'dark' | 'light';
