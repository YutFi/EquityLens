# Architecture

## Principles

- Static site: no backend, no accounts, no paid services.
- Local-first: user data stays in the browser (IndexedDB for series, localStorage for settings).
- Provider adapters: pages never talk to a data source directly.
- Honest data model: every dataset carries its own quality metadata.

## Layout

```
src/
  core/        types, market configuration, market status, date + format helpers
  data/        csv import, aggregation, quality assessment, storage, demo data,
               seed directory, provider interface + registry + catalog
  analytics/   returns, market view, treemap, summaries, indicators, ratios, health, valuation,
               forecast, risk, metrics (per-company rollup), opportunities, sectors, portfolio, alerts
  state/       AppContext (reducer; prices, statements, portfolios, watchlists), useMetrics
  components/  Layout, PriceChart, Heatmap, DataTable, ImportDialog, badges, Disclaimer
  components/research/  Technicals, Financials, Valuation, Forecast, Risk panels (used by Company and top-level pages)
  pages/       Overview, Markets, Discover, Company, Valuation, Forecasting, Opportunities, Screener,
               Comparison, Sectors, Simulator, Watchlist, Methodology, DataSources, Settings, Planned
  nav.ts       navigation with live/planned status
```

## Data model

`Security` (id `MARKET:CODE`, market, code, name, kind, currency, origin) and `PriceSeries` (`bars` of `{t,o,h,l,c,v,adj}` plus `DataQuality`). `DataQuality` records source, last-updated, observation date, currency, coverage, frequency and a `DataStatus` (`verified | delayed | historical | estimated | incomplete | stale | unavailable | demo`). Quality is recomputed from the bars by `assessSeries`, not trusted from the file.

## Providers

```ts
interface PriceProvider { id: string; name: string; load(): Promise<ProviderResult> }
```

`loadFromProviders` uses `Promise.allSettled`, so one failing provider degrades to a notice rather than a crash. Only the local provider is registered. EODHD is an optional on-demand fetch (user key), not a registered provider. To add one, see `CONTRIBUTING.md`.

## Routing and deployment

`HashRouter` is used because GitHub Pages cannot rewrite paths. The Vite `base` is `/EquityLens/` for production builds (override with `VITE_BASE`) and `/` for the dev server.

## Charts

TradingView Lightweight Charts v5 for the candlestick view (attribution logo enabled). Forecast, indicator and comparison charts use a small dependency-free SVG `LineChart`.

## Testing

Vitest + Testing Library. The chart component is mocked in jsdom (no canvas). Calculation modules have direct unit tests.
