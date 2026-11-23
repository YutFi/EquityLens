/**
 * Documentation of every data source investigated for Phase 1, with the fields the specification
 * requires. "Not verified" means exactly that: it was not confirmed by testing or by reading the
 * provider's own terms. Findings are dated; re-check before relying on them.
 */

export interface ProviderDoc {
  id: string;
  name: string;
  state: 'integrated' | 'not-integrated' | 'planned';
  headline: string;
  availableData: string;
  coverage: string;
  updateFrequency: string;
  realtimeOrDelayed: string;
  apiKey: string;
  rateLimits: string;
  licensing: string;
  redistribution: string;
  browserAccess: string;
  reliability: string;
}

export const CATALOG_REVIEWED = '2026-11-23';

export const PROVIDER_CATALOG: ProviderDoc[] = [
  {
    id: 'local-import',
    name: 'Local CSV import (your own files)',
    state: 'integrated',
    headline: 'Works today. Data never leaves your browser.',
    availableData: 'Daily open/high/low/close/volume (and adjusted close if your file has it) for any security.',
    coverage: 'Whatever you import: any exchange, any history length.',
    updateFrequency: 'When you import a new file.',
    realtimeOrDelayed: 'End-of-day history. Never real-time.',
    apiKey: 'None.',
    rateLimits: 'None.',
    licensing: 'Your responsibility: use files you are entitled to use (e.g. your own broker or licensed vendor export).',
    redistribution: 'Not applicable: stored only in your browser, never uploaded or committed.',
    browserAccess: 'Yes. Parsed entirely client-side.',
    reliability: 'As good as the file. The app validates structure but cannot verify values against the exchange.',
  },
  {
    id: 'bursa-malaysia',
    name: 'Bursa Malaysia (official website and data products)',
    state: 'not-integrated',
    headline: 'No documented free public price API found.',
    availableData: 'Company announcements and market pages on the public website; real-time, delayed, end-of-day and historical data are sold as licensed data products.',
    coverage: 'Bursa Malaysia securities and indices.',
    updateFrequency: 'Not verified.',
    realtimeOrDelayed: 'Licensed vendors distribute real-time and delayed data; free-site delay not verified.',
    apiKey: 'Not applicable: no public API identified.',
    rateLimits: 'Not verified.',
    licensing: 'Exchange market data is licensed. Website terms for automated access were not reviewed.',
    redistribution: 'Assume not permitted without a licence.',
    browserAccess: 'Not tested. This build environment cannot reach the site.',
    reliability: 'Authoritative if obtainable, but not obtainable here by a legitimate free route.',
  },
  {
    id: 'yahoo-finance',
    name: 'Yahoo Finance (unofficial endpoints)',
    state: 'not-integrated',
    headline: 'Blocked in browsers (CORS) and unofficial. Not used.',
    availableData: 'Prices and some fundamentals via undocumented endpoints; Bursa tickers use a .KL suffix.',
    coverage: 'Broad, including Bursa Malaysia. Accuracy for smaller counters not verified.',
    updateFrequency: 'Varies.',
    realtimeOrDelayed: 'Typically delayed.',
    apiKey: 'None officially, but recent endpoints require session cookies/crumbs.',
    rateLimits: 'Undocumented; aggressive throttling is commonly reported.',
    licensing: 'Unofficial; consumer terms of service apply. Exact terms not reviewed here.',
    redistribution: 'Assume not permitted. Do not commit scraped data to this repository.',
    browserAccess: 'No. Community reports consistently show missing CORS headers, so a static site cannot call it directly.',
    reliability: 'Endpoints change without notice; the maintained community client library itself says it cannot run in a browser.',
  },
  {
    id: 'stooq',
    name: 'Stooq',
    state: 'not-integrated',
    headline: 'Now needs a CAPTCHA-issued API key; daily quota.',
    availableData: 'Historical OHLCV as CSV.',
    coverage: 'Many global markets; Bursa Malaysia coverage not verified.',
    updateFrequency: 'Daily.',
    realtimeOrDelayed: 'End-of-day.',
    apiKey: 'Required since early 2026 (obtained through a CAPTCHA on the site). The project rule forbids mandatory user-entered keys.',
    rateLimits: 'A daily request quota exists; the figure is not published.',
    licensing: 'Terms not reviewed.',
    redistribution: 'Assume not permitted.',
    browserAccess: 'Not verified; no CORS evidence found.',
    reliability: 'Reported to work for bulk downloads; automation is now gated by the key.',
  },
  {
    id: 'sec-edgar',
    name: 'SEC EDGAR',
    state: 'planned',
    headline: 'Official and free, but US companies only (Phase 7).',
    availableData: 'Filings and XBRL financial data for US-registered companies.',
    coverage: 'US only. Contains no Bursa Malaysia companies.',
    updateFrequency: 'As filings are published.',
    realtimeOrDelayed: 'Not a price feed.',
    apiKey: 'None; a descriptive User-Agent is required.',
    rateLimits: 'Published fair-access limit (not re-verified here).',
    licensing: 'Public-domain US government data.',
    redistribution: 'Generally permitted; confirm before bulk publishing.',
    browserAccess: 'Not verified. A browser cannot set the required User-Agent.',
    reliability: 'High for filings.',
  },
  {
    id: 'keyed-vendors',
    name: 'Keyed vendors (e.g. EODHD, Twelve Data, Alpha Vantage)',
    state: 'not-integrated',
    headline: 'Require API keys; excluded by the no-mandatory-key rule.',
    availableData: 'Prices and fundamentals through documented APIs.',
    coverage: 'Some list Bursa Malaysia instruments; free-tier coverage not verified.',
    updateFrequency: 'Varies by plan.',
    realtimeOrDelayed: 'Varies by plan.',
    apiKey: 'Required.',
    rateLimits: 'Plan-dependent; free tiers are small.',
    licensing: 'Per-vendor terms; free tiers are usually personal use.',
    redistribution: 'Generally not permitted on free plans.',
    browserAccess: 'Not verified.',
    reliability: 'Generally better than unofficial sources.',
  },
];
