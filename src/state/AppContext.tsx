import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { PriceSeries, Security } from '../core/types';
import type { Fundamentals } from '../core/fundamentals';
import type { Portfolio } from '../analytics/portfolio';
import type { Watchlist } from '../analytics/alerts';
import { SEED_SECURITIES } from '../data/seedDirectory';
import { generateDemo, generateDemoFundamentals } from '../data/demoData';
import { loadFromProviders } from '../data/providers/registry';
import {
  clearAllData, DEFAULT_SETTINGS, deleteFundamentals, deleteSeries, isBackup, loadAllFundamentals, loadPortfolios, loadSecurities,
  loadSettings, loadWatchlists, saveFundamentals, savePortfolios, saveSecurities, saveSeries, saveSettings, saveWatchlists,
  type Backup, type Settings,
} from '../data/storage';

interface State {
  status: 'loading' | 'ready';
  settings: Settings;
  /** Securities added by the user or generated as demo (the seed directory is merged in at read time). */
  userSecurities: Security[];
  seriesById: Record<string, PriceSeries>;
  fundamentalsById: Record<string, Fundamentals>;
  portfolios: Portfolio[];
  watchlists: Watchlist[];
  failures: { providerId: string; providerName: string; code: string; message: string }[];
  /** Persistent storage problems shown to the user instead of failing silently. */
  storageError: string | null;
}

type Action =
  | { type: 'loaded'; securities: Security[]; series: PriceSeries[]; fundamentals: Fundamentals[]; portfolios: Portfolio[]; watchlists: Watchlist[]; failures: State['failures'] }
  | { type: 'putFundamentals'; fundamentals: Fundamentals }
  | { type: 'removeFundamentals'; securityId: string }
  | { type: 'portfolios'; list: Portfolio[] }
  | { type: 'watchlists'; list: Watchlist[] }
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
      const fundamentalsById: Record<string, Fundamentals> = {};
      for (const f of action.fundamentals) fundamentalsById[f.securityId] = f;
      return { ...state, status: 'ready', userSecurities: action.securities, seriesById, fundamentalsById, portfolios: action.portfolios, watchlists: action.watchlists, failures: action.failures };
    }
    case 'putFundamentals':
      return { ...state, fundamentalsById: { ...state.fundamentalsById, [action.fundamentals.securityId]: action.fundamentals } };
    case 'removeFundamentals': {
      const { [action.securityId]: _f, ...rest } = state.fundamentalsById;
      void _f;
      return { ...state, fundamentalsById: rest };
    }
    case 'portfolios':
      return { ...state, portfolios: action.list };
    case 'watchlists':
      return { ...state, watchlists: action.list };
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
      const { [action.securityId]: _fund, ...fundRest } = state.fundamentalsById;
      void _fund;
      return { ...state, seriesById: rest, fundamentalsById: fundRest, userSecurities };
    }
    case 'reset':
      return { ...state, userSecurities: [], seriesById: {}, fundamentalsById: {}, portfolios: [], watchlists: [], settings: DEFAULT_SETTINGS };
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
  saveFundamentals: (f: Fundamentals) => Promise<void>;
  removeFundamentals: (securityId: string) => Promise<void>;
  setPortfolios: (list: Portfolio[]) => Promise<void>;
  setWatchlists: (list: Watchlist[]) => Promise<void>;
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
    fundamentalsById: {},
    portfolios: [],
    watchlists: [],
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
      let fundamentals: Fundamentals[] = [];
      let portfolios: Portfolio[] = [];
      let watchlists: Watchlist[] = [];
      try {
        [fundamentals, portfolios, watchlists] = await Promise.all([loadAllFundamentals(), loadPortfolios(), loadWatchlists()]);
      } catch (e) {
        dispatch({ type: 'storageError', message: `Saved statements, portfolios or watchlists could not be read: ${e instanceof Error ? e.message : String(e)}` });
      }
      const report = await loadFromProviders();
      if (!cancelled) dispatch({ type: 'loaded', securities, series: report.series, fundamentals, portfolios, watchlists, failures: report.failures });
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
      const funds = generateDemoFundamentals();
      for (const f of funds) dispatch({ type: 'putFundamentals', fundamentals: f });
      await persist(async () => { for (const s of series) await saveSeries(s); await saveSecurities(nextUser); for (const f of funds) await saveFundamentals(f); });
    },
    removeData: async (securityId) => {
      dispatch({ type: 'removeSeries', securityId });
      const nextUser = state.userSecurities.filter((s) => s.id !== securityId);
      await persist(async () => { await deleteSeries(securityId); await deleteFundamentals(securityId); await saveSecurities(nextUser); });
    },
    saveFundamentals: async (f) => {
      dispatch({ type: 'putFundamentals', fundamentals: f });
      await persist(() => saveFundamentals(f));
    },
    removeFundamentals: async (securityId) => {
      dispatch({ type: 'removeFundamentals', securityId });
      await persist(() => deleteFundamentals(securityId));
    },
    setPortfolios: async (list) => {
      dispatch({ type: 'portfolios', list });
      await persist(() => savePortfolios(list));
    },
    setWatchlists: async (list) => {
      dispatch({ type: 'watchlists', list });
      await persist(() => saveWatchlists(list));
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
      fundamentals: Object.values(state.fundamentalsById),
      portfolios: state.portfolios,
      watchlists: state.watchlists,
    }),
    restoreBackup: async (raw) => {
      if (!isBackup(raw)) return 'This file is not an EquityLens backup (version 1).';
      dispatch({ type: 'putMany', securities: raw.securities, series: raw.series });
      const funds = Array.isArray(raw.fundamentals) ? raw.fundamentals : [];
      for (const f of funds) dispatch({ type: 'putFundamentals', fundamentals: f });
      if (Array.isArray(raw.portfolios)) dispatch({ type: 'portfolios', list: raw.portfolios });
      if (Array.isArray(raw.watchlists)) dispatch({ type: 'watchlists', list: raw.watchlists });
      await persist(async () => {
        for (const s of raw.series) await saveSeries(s);
        await saveSecurities(raw.securities);
        for (const f of funds) await saveFundamentals(f);
        if (Array.isArray(raw.portfolios)) await savePortfolios(raw.portfolios);
        if (Array.isArray(raw.watchlists)) await saveWatchlists(raw.watchlists);
      });
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
