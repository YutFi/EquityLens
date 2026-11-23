# Changelog

All notable changes are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/).

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
