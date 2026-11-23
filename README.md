# EquityLens

**See Beyond the Stock Price.**

A free, open-source, no-account stock research and education platform, Malaysia (Bursa) first. It runs entirely in your browser, is hosted as a static site, and uses no paid API, backend or subscription.

> **Status: v0.3.0.** Only what is listed under "What works today" exists. Everything else is labelled as not built inside the app. See [`PROJECT_SPEC.md`](PROJECT_SPEC.md) for the full vision and [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) for the honest gaps.

## Read this first: data

**There is no automatic live Bursa Malaysia price or financial-statement feed in this release, and the app says so.** No free, legitimately usable, browser-accessible source was found that works from a static site without an API key, a paid proxy or a backend (details in [`docs/DATA_PROVIDERS.md`](docs/DATA_PROVIDERS.md)). That is why charts and dashboards only show what you load. Rather than scrape an unlicensed source or invent numbers, EquityLens works with:

1. **Your own price data**: import daily OHLCV CSV files you are entitled to use. Stored only in your browser.
2. **Your own financial statements**: type them in from a company's published report, or import a CSV (template provided). Labelled "entered by you", never verified.
3. **Optional: Moomoo local bridge** (Settings). A read-only script on your computer serves daily candles and a live quote from your own Moomoo account to the app. The API is free, but market data needs the quote right on your account. **Experimental and untested against a live account.** See [docs/MOOMOO_BRIDGE.md](docs/MOOMOO_BRIDGE.md).
4. **Optional: your own EODHD key** (Settings). Adds a *Fetch from EODHD* button for Bursa companies. **Experimental and untested live**: the build environment could not reach eodhd.com, so CORS and free-plan Bursa coverage are unconfirmed. If it fails you get a plain explanation and CSV import still works.
4. **Synthetic demo data**: fictional companies with generated prices *and generated statements* so every page can be explored. Always labelled synthetic, never presented as market data.
5. **An unverified seed directory** of well-known Bursa names (code and name only; not the official listing).

Nothing in the app is labelled "verified".

## What works today

Everything below runs on the data you have loaded, in your browser. Each calculation is unit-tested and documented in [`docs/FORMULAS.md`](docs/FORMULAS.md).

- **Overview / Markets / Discover**: index card, breadth, movers, unusual volume, volatility, traded-value heatmap, rule-based non-causal summary, security directory
- **Company Research** (tabs): candlestick chart; moving averages, Bollinger bands, RSI, MACD, ATR, support and resistance with plain-language readings; financial statements, 20 ratios with formulas, and a transparent 0-100 financial-health score; valuation (DCF, peers, own history, dividend model, bank P/B) with editable assumptions; statistical forecast with walk-forward backtest; risk metrics and what-if sliders
- **Valuation / Forecasting**: the same tools for any loaded company
- **Opportunities** and **Stock Screener**: rule-based research-priority scanner (undervalued, growth, dividend, momentum, recovery, warning signals) with visible criteria and "no data" handled separately from "failed"; filters across price, valuation, growth, yield, health and risk
- **Comparison** (up to 5 companies, rebased chart + metrics), **Sector Intelligence** (medians of loaded companies), **Investment Simulator** (hypothetical portfolios, average cost, realised/unrealised P/L, user-entered dividends), **Watchlist** with alert rules (checked only while the site is open)
- CSV import with strict validation; backup/restore (prices, statements, portfolios, watchlists); clear-all; no tracking; dark/light; Beginner/Advanced; responsive

## What is not built

- **Company events, announcements and news**: no free licensed Bursa feed; nothing is invented.
- **Research assistant**: needs a language-model service, which conflicts with the no-account/no-paid-API rules.
- ARIMA (deliberately omitted), automatic financial statements, real-time prices, other exchanges (NASDAQ, NYSE, SGX, HKEX, LSE are configured but not built).
- Cross-company analysis covers only companies you have loaded, never "the market".

Forecasts, valuations and scores are estimates from simple models. In testing on synthetic prices, the forecast page frequently reports that no method beat the naive baseline; that is the intended honest outcome, not a bug.

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
| [`docs/FORECASTING.md`](docs/FORECASTING.md) | Forecasting methodology as implemented |
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md), [`DEVELOPMENT.md`](docs/DEVELOPMENT.md), [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Setup, workflow, GitHub Pages |
| [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) | What this release cannot do |
| [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CHANGELOG.md`](CHANGELOG.md) | Contributing and release notes |

## Disclaimer

EquityLens is an independent financial research and educational platform. Financial information, calculations, assessments and forecasts are provided for informational purposes only. Historical performance does not guarantee future results. Forecasts are estimates based on available data and assumptions and may be inaccurate. Nothing on this platform constitutes personalised financial advice or a recommendation to buy or sell any financial instrument. Users are responsible for conducting their own research and making independent investment decisions.

## Licence

[MIT](LICENSE). Charts by [TradingView Lightweight Charts™](https://github.com/tradingview/lightweight-charts) (Apache-2.0, attribution displayed).
