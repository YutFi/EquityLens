# Known limitations (v0.1.0)

## Data
- **No live or automatic market data.** Prices come from CSV files you import or from labelled synthetic demo data.
- Imported data is treated as unverified; the app cannot confirm its accuracy, completeness or corporate-action adjustment.
- Market capitalisation, shares outstanding, sector classification beyond a few well-known names, and index constituents are unavailable (shown as "Unavailable").
- The seed directory is hand-compiled and unverified; it is not the official Bursa listing or KLCI constituent list.

## Features not built
Financial statements and ratios, health scoring, valuation, technical indicators, forecasting, backtesting, opportunity scanner, screener, news and announcements, comparison, sector intelligence, simulator, watchlist and alerts, and non-Bursa markets. Their pages are placeholders marked "Planned".

## Behaviour
- Market status uses standard weekday session hours. **Exchange holidays and special sessions are not included**, so the app can show "Open" on a holiday.
- Gap detection cannot distinguish a holiday period from missing data, so a long holiday can flag a series as "Incomplete".
- Market statements describe loaded data only; breadth and movers reflect the securities you have loaded, not the whole exchange.
- The heatmap is sized by traded value (close × volume), not market capitalisation.
- Weekly/monthly bars are built from daily bars you provide.
- Storage is per-browser and per-origin; clearing site data or using private mode removes it. Use backup/restore.

## Verification
- Rendering was checked in headless Chrome and by automated tests; accessibility has not been audited with assistive technology.
- Live provider behaviour (CORS, limits, terms) has not been tested; see `DATA_PROVIDERS.md`.
