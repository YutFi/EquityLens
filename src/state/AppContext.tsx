import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { PriceSeries, Security } from '../core/types';
import { SEED_SECURITIES } from '../data/seedDirectory';
import { generateDemo } from '../data/demoData';
import { loadFromProviders } from '../data/providers/registry';
import {
  clearAllData, DEFAULT_SETTINGS, deleteSeries, isBackup, loadSecurities, loadSettings,
  saveSecurities, saveSeries, saveSettings, type Backup, type Settings,
} from '../data/storage';

interface State {
  status: 'loading' | 'ready';
  settings: Settings;
  /** Securities added by the user or generated as demo (the seed directory is merged in at read time). */
  userSecurities: Security[];
  seriesById: Record<string, PriceSeries>;
  failures: { providerId: string; providerName: string; code: string; message: string }[];
  /** Persistent storage problems shown to the user instead of failing silently. */
  storageError: string | null;
}

type Action =
  | { type: 'loaded'; securities: Security[]; series: PriceSeries[]; failures: State['failures'] }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'putSeries'; security: Security; series: PriceSeries }
  | { type: 'putMany'; securities: Security[]; series: PriceSeries[] }
  | { type: 'removeSeries'; securityId: string }
  | { type: 'reset' }
  | { type: 'storageError'; message: string | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded': {
      const seriesById: Record<string, PriceSeries> = {};
      for (const s of action.series) seriesById[s.securityId] = s;
      return { ...state, status: 'ready', userSecurities: action.securities, seriesById, failures: action.failures };
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'putSeries':
      return {
        ...state,
        userSecurities: [...state.userSecurities.filter((s) => s.id !== action.security.id), action.security],
        seriesById: { ...state.seriesById, [action.series.securityId]: action.series },
      };
    case 'putMany': {
      const ids = new Set(action.securities.map((s) => s.id));
      const seriesById = { ...state.seriesById };
      for (const s of action.series) seriesById[s.securityId] = s;
      return { ...state, userSecurities: [...state.userSecurities.filter((s) => !ids.has(s.id)), ...action.securities], seriesById };
    }
    case 'removeSeries': {
      const { [action.securityId]: _gone, ...rest } = state.seriesById;
      void _gone;
      // Demo and imported-only securities disappear with their data; seed securities remain in the directory.
      const userSecurities = state.userSecurities.filter((s) => s.id !== action.securityId);
      return { ...state, seriesById: rest, userSecurities };
    }
    case 'reset':
      return { ...state, userSecurities: [], seriesById: {}, settings: DEFAULT_SETTINGS };
    case 'storageError':
      return { ...state, storageError: action.message };
  }
}

export interface AppApi {
  state: State;
  /** Seed directory merged with user-added securities (user entries win on id clashes). */
  securities: Security[];
  setSettings: (patch: Partial<Settings>) => void;
  importSeries: (security: Security, series: PriceSeries) => Promise<void>;
  loadDemo: () => Promise<void>;
  removeData: (securityId: string) => Promise<void>;
  clearEverything: () => Promise<void>;
  exportBackup: () => Backup;
  restoreBackup: (b: unknown) => Promise<string | null>;
  hasDemoData: boolean;
}

const Ctx = createContext<AppApi | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    status: 'loading',
    settings: loadSettings(),
    userSecurities: [],
    seriesById: {},
    failures: [],
    storageError: null,
  } satisfies State);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    saveSettings(state.settings);
  }, [state.settings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let securities: Security[] = [];
      try {
        securities = await loadSecurities();
      } catch (e) {
        dispatch({ type: 'storageError', message: `Saved securities could not be read: ${e instanceof Error ? e.message : String(e)}` });
      }
      const report = await loadFromProviders();
      if (!cancelled) dispatch({ type: 'loaded', securities, series: report.series, failures: report.failures });
    })();
    return () => { cancelled = true; };
  }, []);

  const securities = useMemo(() => {
    const byId = new Map<string, Security>();
    for (const s of SEED_SECURITIES) byId.set(s.id, s);
    for (const s of state.userSecurities) byId.set(s.id, s);
    return [...byId.values()];
  }, [state.userSecurities]);

  const persist = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn();
      dispatch({ type: 'storageError', message: null });
    } catch (e) {
      dispatch({
        type: 'storageError',
        message: `Could not save to browser storage (${e instanceof Error ? e.message : String(e)}). Your data is visible this session but will be lost when you close the tab.`,
      });
    }
  }, []);

  const api = useMemo<AppApi>(() => ({
    state,
    securities,
    hasDemoData: state.userSecurities.some((s) => s.origin === 'demo'),
    setSettings: (patch) => dispatch({ type: 'settings', patch }),
    importSeries: async (security, series) => {
      dispatch({ type: 'putSeries', security, series });
      const nextUser = [...state.userSecurities.filter((s) => s.id !== security.id), security];
      await persist(async () => { await saveSeries(series); await saveSecurities(nextUser); });
    },
    loadDemo: async () => {
      const { securities: demoSec, series } = generateDemo();
      dispatch({ type: 'putMany', securities: demoSec, series });
      const ids = new Set(demoSec.map((s) => s.id));
      const nextUser = [...state.userSecurities.filter((s) => !ids.has(s.id)), ...demoSec];
      await persist(async () => { for (const s of series) await saveSeries(s); await saveSecurities(nextUser); });
    },
    removeData: async (securityId) => {
      dispatch({ type: 'removeSeries', securityId });
      const nextUser = state.userSecurities.filter((s) => s.id !== securityId);
      await persist(async () => { await deleteSeries(securityId); await saveSecurities(nextUser); });
    },
    clearEverything: async () => {
      dispatch({ type: 'reset' });
      await persist(clearAllData);
    },
    exportBackup: () => ({
      app: 'EquityLens' as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      securities: state.userSecurities,
      series: Object.values(state.seriesById),
    }),
    restoreBackup: async (raw) => {
      if (!isBackup(raw)) return 'This file is not an EquityLens backup (version 1).';
      dispatch({ type: 'putMany', securities: raw.securities, series: raw.series });
      await persist(async () => { for (const s of raw.series) await saveSeries(s); await saveSecurities(raw.securities); });
      return null;
    },
  }), [state, securities, persist]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApp(): AppApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
