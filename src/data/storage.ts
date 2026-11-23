import { createStore, del, entries, get, set, clear } from 'idb-keyval';
import type { AnalysisLevel, MarketId, PriceSeries, Security, ThemeKey } from '../core/types';

/**
 * Local-first persistence. Everything stays in this browser: series and added securities live in
 * IndexedDB, small preferences in localStorage. Nothing is sent to any server.
 */

const store = createStore('equitylens', 'kv');
const SERIES_PREFIX = 'series:';
const SECURITIES_KEY = 'securities';
const SETTINGS_KEY = 'equitylens.settings.v1';

export interface Settings {
  market: MarketId;
  theme: ThemeKey;
  level: AnalysisLevel;
}

export const DEFAULT_SETTINGS: Settings = { market: 'XKLS', theme: 'dark', level: 'beginner' };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      market: parsed.market ?? DEFAULT_SETTINGS.market,
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      level: parsed.level === 'advanced' ? 'advanced' : 'beginner',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage may be unavailable (private mode); preferences then last for the session only */
  }
}

export async function saveSeries(series: PriceSeries): Promise<void> {
  await set(SERIES_PREFIX + series.securityId, series, store);
}

export async function loadAllSeries(): Promise<PriceSeries[]> {
  const all = await entries<string, PriceSeries>(store);
  return all.filter(([k]) => k.startsWith(SERIES_PREFIX)).map(([, v]) => v);
}

export async function deleteSeries(securityId: string): Promise<void> {
  await del(SERIES_PREFIX + securityId, store);
}

export async function saveSecurities(list: Security[]): Promise<void> {
  await set(SECURITIES_KEY, list, store);
}

export async function loadSecurities(): Promise<Security[]> {
  return (await get<Security[]>(SECURITIES_KEY, store)) ?? [];
}

export async function clearAllData(): Promise<void> {
  await clear(store);
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    /* ignore */
  }
}

export interface Backup {
  app: 'EquityLens';
  version: 1;
  exportedAt: string;
  settings: Settings;
  securities: Security[];
  series: PriceSeries[];
}

export function isBackup(x: unknown): x is Backup {
  const b = x as Backup;
  return !!b && b.app === 'EquityLens' && b.version === 1 && Array.isArray(b.securities) && Array.isArray(b.series);
}
