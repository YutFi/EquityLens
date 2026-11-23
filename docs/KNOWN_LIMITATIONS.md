# Known limitations (v0.2.0)

## Data
- **No live or automatic market data.** Prices come from CSV files you import or from labelled synthetic demo data.
- Imported data is treated as unverified; the app cannot confirm its accuracy, completeness or corporate-action adjustment.
- Market capitalisation and shares outstanding exist only if **you** enter them with your statements. Sector classification beyond a few well-known names and index constituents are unavailable.
- **Financial statements are entered or imported by you.** EquityLens cannot verify them, and every ratio, score, valuation and scanner result inherits any error in what was typed.
- The optional EODHD route is **untested live** (CORS and free-plan Bursa coverage unconfirmed; the free plan documents ~20 calls/day and 12 months of history).
- The seed directory is hand-compiled and unverified; it is not the official Bursa listing or KLCI constituent list.

## Features not built
Company events, announcements and news; a natural-language research assistant; ARIMA; automatic statements; real-time prices; non-Bursa markets. Their pages (where shown) are labelled "Planned" with the reason.

## Analysis caveats
- Forecasts are simple statistical extrapolations. On many series no method beats the naive baseline and the page says so. Backtest origins overlap, so evidence is weaker than the count suggests.
- Valuation outputs depend heavily on assumptions; the default 10% discount rate is a placeholder, not a derived cost of equity. Methods often disagree widely.
- The health score and opportunity scanner use fixed thresholds chosen by the developer, not calibrated on market outcomes. They rank research priority and do not predict returns.
- Peer comparisons, sector medians and the scanner use only the companies you have loaded (peers need at least 3 in a sector) and unverified sector labels. Small groups make medians unstable.
- The simulator uses the average-cost method, ignores taxes, stamp duty unless typed as fees, and knows no dividend dates.
- Alerts run only while the site is open; there is no background monitoring. Browser notifications need your permission.
- Exchange holidays are unknown to forecasts and market status.

## Behaviour
- Market status uses standard weekday session hours. **Exchange holidays and special sessions are not included**, so the app can show "Open" on a holiday.
- Gap detection cannot distinguish a holiday period from missing data, so a long holiday can flag a series as "Incomplete".
- Market statements describe loaded data only; breadth and movers reflect the securities you have loaded, not the whole exchange.
- The heatmap is sized by traded value (close × volume), not market capitalisation.
- Weekly/monthly bars are built from daily bars you provide.
- Storage is per-browser and per-origin; clearing site data or using private mode removes it. Use backup/restore.

## Verification
- Rendering was checked in headless Chrome (dark, light, mobile width) and by automated tests; accessibility has not been audited with assistive technology. The live GitHub Pages site could not be opened from the build environment.
- Live provider behaviour (CORS, limits, terms) has not been tested; see `DATA_PROVIDERS.md`.
