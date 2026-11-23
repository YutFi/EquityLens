# Changelog

All notable changes are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] - 2026-11-23

### Added
- Optional, experimental **Moomoo local bridge**: a read-only Python script (`bridge/moomoo_bridge.py`) that serves daily candles and a snapshot quote from the user's own Moomoo OpenD on loopback, with a mock mode and CSV export
- Settings panel for the bridge (loopback-only address, connection test), a **Fetch from Moomoo bridge** button and a **Live quote** toggle on Bursa company pages (polls only while enabled and the page is visible; display-only)
- `docs/MOOMOO_BRIDGE.md` with costs, setup, safety model and what is not verified; provider catalog entry
- Python unit tests for the bridge (CI job) and TypeScript tests for the client and polling hook

### Safety
- Moomoo data is never labelled "verified"; mock-bridge data is labelled synthetic and cannot overwrite real stored data
- The app refuses non-loopback bridge addresses; the bridge binds to loopback, checks Host and Origin, and contains no trading code

## [0.2.0] - 2026-11-23

### Added
- Technical indicators (SMA/EMA, RSI, MACD, Bollinger, ATR, swing support/resistance) with neutral plain-language readings
- Financial statements entry and CSV import (units selector, strict validation), 20 ratios with formulas and source periods, and a transparent financial-health score
- Valuation: DCF, same-sector peer multiples, own-history P/E, Gordon dividend model, bank justified P/B; adjustable assumptions; conservative/base/optimistic
- Forecasting with six simple log-price methods, 80% bands, walk-forward backtest (select on first half, judge on second), naive baseline, honest reliability labels
- Risk: volatility, drawdown, VaR, downside deviation, beta, fundamental stability, what-if earnings and price-shock sliders
- Pages: Opportunities, Stock Screener, Valuation, Forecasting, Comparison, Sector Intelligence, Investment Simulator, Watchlist (alerts only while the site is open)
- Optional, experimental EODHD fetch using the user's own key (untested live; key is stored only in the browser and never exported)
- Synthetic demo statements for the fictional demo companies
- Backup now includes statements, portfolios and watchlists
- `Events & News` and `Research Assistant` listed as not built, with reasons

### Changed
- Sidebar, methodology, data-source and settings text updated to match what exists
- Charts for forecasts and comparison are dependency-free SVG with hover read-out

## [0.1.1] - 2026-11-23

### Fixed
- GitHub Pages deployment: CI failed because jsdom 31 needs a newer Node than the Node 20 configured. CI now uses Node 22 and `package.json` declares `engines.node >= 22`.
- Price chart kept its original colours after switching theme; it now rebuilds on theme change.

### Changed
- Visual redesign: layered "ink and glass" surfaces, ambient gradient, Inter (bundled locally), grouped sidebar with icons, search shortcut (`/`), live market-status pill, pill-style controls, refined tables, improved heatmap, polished light theme and mobile header.
- Added sparklines (benchmark, company, movers table) and an advancing/declining breadth bar. All are drawn only from loaded data.

## [0.1.0] - 2026-11-23

Phase 1 foundation. First release.

### Added
- React + TypeScript + Vite application, hash-routed for GitHub Pages
- Market configuration (Bursa active; NASDAQ, NYSE, SGX, HKEX, LSE configured as planned) and standard-hours market status
- Provider-adapter architecture; local-import provider
- Strict OHLCV CSV import with error reporting and de-duplication
- Local-first storage (IndexedDB + localStorage), backup/restore, clear-all
- Data-status badges and data-quality panel on every dataset
- Overview and Markets dashboards, traded-value heatmap, rule-based non-causal summary
- Company page with candlestick/volume chart, weekly/monthly aggregation, optional adjusted prices
- Discover page and an unverified seed directory of Bursa securities
- Synthetic demo data generator (fictional companies, always labelled)
- Beginner/Advanced modes, dark/light themes, responsive layout
- Methodology and Data Sources pages; prominent disclaimer
- 48 automated tests

### Not included
- Live market data, fundamentals, valuation, forecasting, screener, news, comparison, simulator, watchlist, other exchanges. See `docs/KNOWN_LIMITATIONS.md`.
