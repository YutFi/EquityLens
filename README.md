# EquityLens

**See Beyond the Stock Price.**

A free, open-source, no-account stock research and education platform, Malaysia (Bursa) first. It runs entirely in your browser, is hosted as a static site, and uses no paid API, backend or subscription.

## Try it in your browser

**Open the app: https://yutfi.github.io/EquityLens/**

No install, no account, no key. Everything you load stays in your own browser. (The page is published by GitHub Pages from the `main` branch; if the link shows a 404, see "Publish your own copy" below.)

New here? Go to [How to use it](#how-to-use-it) for a five-minute walkthrough.

> **Status: v0.3.0.** Only what is listed under "What works today" exists. Everything else is labelled as not built inside the app. See [`PROJECT_SPEC.md`](PROJECT_SPEC.md) for the full vision and [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) for the honest gaps.

## Read this first: data

**There is no automatic live Bursa Malaysia price or financial-statement feed in this release, and the app says so.** No free, legitimately usable, browser-accessible source was found that works from a static site without an API key, a paid proxy or a backend (details in [`docs/DATA_PROVIDERS.md`](docs/DATA_PROVIDERS.md)). That is why charts and dashboards only show what you load. Rather than scrape an unlicensed source or invent numbers, EquityLens works with:

1. **Your own price data**: import daily OHLCV CSV files you are entitled to use. Stored only in your browser.
2. **Your own financial statements**: type them in from a company's published report, or import a CSV (template provided). Labelled "entered by you", never verified.
3. **Optional: Moomoo local bridge** (Settings). A read-only script on your computer serves daily candles and a live quote from your own Moomoo account to the app. The API is free, but market data needs the quote right on your account. **Experimental and untested against a live account.** See [docs/MOOMOO_BRIDGE.md](docs/MOOMOO_BRIDGE.md).
4. **Optional: your own EODHD key** (Settings). Adds a *Fetch from EODHD* button for Bursa companies. **Experimental and untested live**: the build environment could not reach eodhd.com, so CORS and free-plan Bursa coverage are unconfirmed. If it fails you get a plain explanation and CSV import still works.
5. **Synthetic demo data**: fictional companies with generated prices *and generated statements* so every page can be explored. Always labelled synthetic, never presented as market data.
6. **An unverified seed directory** of well-known Bursa names (code and name only; not the official listing).

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

## How to use it

The app starts empty on purpose: it shows only data you load and never invents prices.

### 1. Explore with demo data (1 minute)

1. Open the app and go to **Settings** (bottom of the left menu).
2. Press **Load synthetic demo data**. This adds fictional companies (names ending in "synthetic") with generated prices and statements, so every page has something to show. It is always labelled *Synthetic demo* and is not market data.
3. Visit **Overview**, **Company Research**, **Opportunities**, **Forecasting** and the other pages. When you are done, **Settings → Remove demo data**.

### 2. Load real price history

1. Get a daily price file (CSV) you are allowed to use, for example an export from your broker. Columns: `Date, Open, High, Low, Close, Volume` (optionally `Adj Close`). Dates must be `YYYY-MM-DD` unless you choose another order in the dialog.
2. Press **Import data** (top right). Pick the company from **Security**, or add a new code and name (Bursa codes such as `1155`).
3. Choose the CSV file, or paste the text, then press **Import**. The report shows any rejected rows; nothing is repaired or invented.
4. Open **Company Research** and click the company. Use the range buttons (1M to MAX) and Daily/Weekly/Monthly to change the chart.

You can also use the Moomoo bridge or an EODHD key to fetch prices (see below), but CSV import always works.

### 3. Add financial statements (for ratios, health score and valuation)

1. On a company page open the **Financials & health** tab and press **Enter or import financials**.
2. Type figures from the company's published annual report, or press **Download template**, fill it in and import it. Leave a box empty if you do not have the figure; losses are negative numbers.
3. The tab then shows the ratios (with formulas and source periods) and the health score. **Valuation** and **Risk** use the same figures. Statements are labelled "entered by you".

### 4. Use the analysis pages

| Page | What to do |
| --- | --- |
| **Company Research** | Tabs: Overview, Price & technicals, Financials & health, Valuation, Forecast, Risk. |
| **Valuation / Forecasting** | Pick a company. Valuation assumptions are editable. Forecasts show a range, a backtest and a reliability label; "no method beat the naive baseline" is a normal, honest result. |
| **Opportunities / Stock Screener** | A rule-based research-priority list and filters. Open the criteria to see why something scored as it did. "No data" is shown separately from "failed". |
| **Comparison** | Up to five companies on one rebased chart. |
| **Sector Intelligence** | Medians across the companies you have loaded. |
| **Investment Simulator** | Create a hypothetical portfolio, add trades and dividends you type in, and see profit and loss. No real money. |
| **Watchlist** | Create a list and alert rules. Alerts are checked only while the site is open. |
| **Methodology / Data Sources** | How each number is calculated and the honest status of each data source. |

Header controls: **Beginner / Advanced** (more detail), light/dark theme, and the market selector. Press `/` to search.

### 5. Use it on an iPhone or iPad

1. Open https://yutfi.github.io/EquityLens/ in **Safari**.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**. EquityLens now opens full screen like an app, with its own icon.
3. Press **Import data** and choose a CSV from the **Files** app, or paste CSV text. Everything else works the same as on a computer.

Things to know on iPhone:

- **Live Moomoo data is not possible on a phone.** Moomoo's OpenD gateway runs only on Windows, Mac and Linux, and the Moomoo phone app cannot share data with other apps. The Moomoo bridge section in Settings says so and is switched off on iOS.
- **Carry data from a computer to your phone:** set up the bridge on a computer, fetch prices, press **Settings → Export backup**, send the file to your phone (AirDrop or iCloud Drive), then **Settings → Restore from backup** on the phone. You get the prices as of the moment you exported, not live.
- **Safari can delete saved website data** if you do not visit for about a week; sites added to the Home Screen are treated differently. Export a backup regularly.
- It needs an internet connection to open the first time and has no offline mode yet.
- Not yet tested on a physical iPhone: layout was checked at iPhone screen sizes in a desktop browser only.

### 6. Back up your data

Everything is stored in your browser only, so clearing site data or using a private window removes it. Use **Settings → Export backup** regularly, and **Restore from backup** to bring it back on this or another device.

### Optional: live-ish data

- **Moomoo local bridge (experimental).** For daily candles and a live quote from your own Moomoo account.
  1. Install and log in to Moomoo's OpenD on your computer and leave it running.
  2. `pip install moomoo-api` (Python 3.9+).
  3. In a terminal, from the EquityLens folder: `python3 bridge/moomoo_bridge.py serve` (add `--mock` to try it with synthetic data and no account).
  4. In the app: **Settings → Moomoo local bridge**, tick **Use the Moomoo bridge**, press **Test connection**.
  5. On a Bursa company page press **Fetch from Moomoo bridge** (stores up to 3 years of daily bars) and/or **Live quote** (updates the price every 15 seconds while the page is open).

  Your account needs the quote right for Bursa data; if it does not, the app shows a "no quote right" message. Details, costs and limits: [`docs/MOOMOO_BRIDGE.md`](docs/MOOMOO_BRIDGE.md). If your browser blocks the connection, run `python3 bridge/moomoo_bridge.py export 1155 --out-dir moomoo_export` and import the CSV instead.
- **EODHD key (experimental).** Paste your own key under **Settings → EODHD**; a **Fetch from EODHD** button then appears on Bursa company pages.

### Troubleshooting

- *The page is blank or shows nothing:* that is the empty state. Load demo data or import a CSV.
- *Import rejects rows:* check the date format and that Open/High/Low/Close are positive numbers; the report names the problem rows.
- *"Not enough history" for a forecast:* forecasts need at least 150 daily bars.
- *My data disappeared:* browser storage was cleared or you used a private window. Restore from a backup.
- *Moomoo "could not reach the bridge":* check the script is running, the address in Settings matches, and allow your browser's prompt to access devices on your network. Otherwise use the CSV export.

## Set up on your own computer

You need **Node.js 22 or newer** and **npm** (and optionally Python 3.9+ for the Moomoo bridge).

```bash
git clone https://github.com/YutFi/EquityLens.git
cd EquityLens
npm install
npm run dev        # opens a local copy at http://localhost:5173
```

Other commands:

```bash
npm test           # unit and smoke tests
npm run typecheck  # TypeScript check
npm run build      # production build in dist/
npm run preview    # serve the production build locally
python3 -m unittest discover -s bridge   # bridge tests (no account needed)
```

More detail: [`docs/INSTALLATION.md`](docs/INSTALLATION.md) and [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## Publish your own copy on GitHub Pages

1. Fork or push this repository to your GitHub account.
2. In the repository open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the *Deploy to GitHub Pages* workflow from the **Actions** tab). The workflow type-checks, tests, builds and publishes.
4. Your site appears at `https://<your-username>.github.io/<repository-name>/`. If you rename the repository, set `VITE_BASE` in the workflow to `/<new-name>/`. Details: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## CSV format reference

Header names are matched case-insensitively with common aliases: `Date, Open, High, Low, Close, Volume` and optionally `Adj Close`. Dates must be ISO (`YYYY-MM-DD`) unless you explicitly choose DD/MM or MM/DD. Invalid rows are rejected and reported.

Make sure you have the right to use the data you import. Many vendors forbid redistribution; see [`docs/DATA_LICENSING.md`](docs/DATA_LICENSING.md).

## Documentation

| Doc | Purpose |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Structure, data model, provider adapters |
| [`docs/DATA_PROVIDERS.md`](docs/DATA_PROVIDERS.md) | Source investigation and findings |
| [`docs/DATA_LICENSING.md`](docs/DATA_LICENSING.md) | Licensing and redistribution notes |
| [`docs/MOOMOO_BRIDGE.md`](docs/MOOMOO_BRIDGE.md) | Moomoo local bridge: costs, setup, safety, limits |
| [`docs/FORMULAS.md`](docs/FORMULAS.md) | Every calculation currently implemented |
| [`docs/FORECASTING.md`](docs/FORECASTING.md) | Forecasting methodology as implemented |
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md), [`DEVELOPMENT.md`](docs/DEVELOPMENT.md), [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Setup, workflow, GitHub Pages |
| [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) | What this release cannot do |
| [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CHANGELOG.md`](CHANGELOG.md) | Contributing and release notes |

## Disclaimer

EquityLens is an independent financial research and educational platform. Financial information, calculations, assessments and forecasts are provided for informational purposes only. Historical performance does not guarantee future results. Forecasts are estimates based on available data and assumptions and may be inaccurate. Nothing on this platform constitutes personalised financial advice or a recommendation to buy or sell any financial instrument. Users are responsible for conducting their own research and making independent investment decisions.

## Licence

[MIT](LICENSE). Charts by [TradingView Lightweight Charts™](https://github.com/tradingview/lightweight-charts) (Apache-2.0, attribution displayed).
