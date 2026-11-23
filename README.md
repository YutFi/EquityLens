# EquityLens

**See Beyond the Stock Price.**

A free, open-source, no-account stock research and education platform, Malaysia (Bursa) first. It runs entirely in your browser, is hosted as a static site, and uses no paid API, backend or subscription.

> **Status: Phase 1 foundation (v0.1.0).** Only what is listed under "What works today" exists. Everything else is planned and is labelled as planned inside the app. See [`PROJECT_SPEC.md`](PROJECT_SPEC.md) for the full vision and [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) for the honest gaps.

## Read this first: data

**There is no live Bursa Malaysia price feed in this release.** No free, legitimately usable, browser-accessible source was found that works from a static site without an API key, a paid proxy or a backend (details in [`docs/DATA_PROVIDERS.md`](docs/DATA_PROVIDERS.md)). Rather than scrape an unlicensed source or invent numbers, Phase 1 works with:

1. **Your own data**: import daily OHLCV CSV files you are entitled to use. Stored only in your browser.
2. **Synthetic demo data**: fictional companies with generated prices so you can explore the interface. Always labelled "Synthetic demo", never presented as market data.
3. **An unverified seed directory** of well-known Bursa names (code and name only; not the official listing).

Nothing in the app is labelled "verified" in this release.

## What works today

- Dark/light terminal-style interface, Beginner and Advanced modes, responsive layout
- Market selector (Bursa active; NASDAQ, NYSE, SGX, HKEX, LSE are configured but planned for Phase 7)
- Company search and a browsable security directory
- CSV import with strict validation, a visible error report, no silent repair
- Overview and Markets dashboards computed only from the data you loaded: index card, breadth, movers, unusual volume, volatility, a traded-value heatmap and a rule-based, non-causal summary
- Company page: candlestick + volume chart (daily/weekly/monthly, range buttons, optional adjusted prices when the file supplies them), plain-language history description, data-quality panel
- A data-status badge and a data-quality panel for every dataset
- Backup/restore of local data, clear-all, no tracking

## What is not built

Financial statements and ratios, financial-health scoring, valuation, technical indicators, forecasting, backtesting, opportunity scanner, screener, news/announcements, comparison, sector intelligence, simulator, watchlist and alerts, other exchanges. These pages exist only as labelled placeholders. See the roadmap in `PROJECT_SPEC.md`.

## Quick start

```bash
git clone https://github.com/YutFi/EquityLens.git
cd EquityLens
npm install
npm run dev      # http://localhost:5173
npm test         # unit and smoke tests
npm run build    # production build in dist/
```

Requires Node.js 22+. See [`docs/INSTALLATION.md`](docs/INSTALLATION.md).

## Importing your data

Use **Import data** in the header. Expected columns (header names are matched case-insensitively with common aliases): `Date, Open, High, Low, Close, Volume` and optionally `Adj Close`. Dates must be ISO (`YYYY-MM-DD`) unless you explicitly choose DD/MM or MM/DD. Invalid rows are rejected and reported; nothing is repaired or invented.

Make sure you have the right to use the data you import. Many vendors forbid redistribution; see [`docs/DATA_LICENSING.md`](docs/DATA_LICENSING.md).

## Documentation

| Doc | Purpose |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Structure, data model, provider adapters |
| [`docs/DATA_PROVIDERS.md`](docs/DATA_PROVIDERS.md) | Source investigation and findings |
| [`docs/DATA_LICENSING.md`](docs/DATA_LICENSING.md) | Licensing and redistribution notes |
| [`docs/FORMULAS.md`](docs/FORMULAS.md) | Every calculation currently implemented |
| [`docs/FORECASTING.md`](docs/FORECASTING.md) | Forecasting methodology (planned, not implemented) |
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md), [`DEVELOPMENT.md`](docs/DEVELOPMENT.md), [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Setup, workflow, GitHub Pages |
| [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) | What this release cannot do |
| [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CHANGELOG.md`](CHANGELOG.md) | Contributing and release notes |

## Disclaimer

EquityLens is an independent financial research and educational platform. Financial information, calculations, assessments and forecasts are provided for informational purposes only. Historical performance does not guarantee future results. Forecasts are estimates based on available data and assumptions and may be inaccurate. Nothing on this platform constitutes personalised financial advice or a recommendation to buy or sell any financial instrument. Users are responsible for conducting their own research and making independent investment decisions.

## Licence

[MIT](LICENSE). Charts by [TradingView Lightweight Charts™](https://github.com/tradingview/lightweight-charts) (Apache-2.0, attribution displayed).
