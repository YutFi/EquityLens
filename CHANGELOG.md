# Changelog

All notable changes are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/).

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
