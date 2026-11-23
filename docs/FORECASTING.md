# Forecasting methodology (as implemented in v0.3.0)

Forecasts are **statistical scenarios**, not predictions or price targets. Code: `src/analytics/forecast.ts`, tests in `src/analytics/phase3.test.ts`.

## Methods (all on log prices)

| Method | Idea |
| --- | --- |
| Naive | price stays at the last close (the baseline everything must beat) |
| 20-day average | reverts towards the recent 20-day mean |
| Drift | continues the average daily log return |
| Linear trend | extends a line fitted to the last ~120 log prices |
| Damped smoothing | Holt-style level and trend, with the trend fading |
| Ensemble | average of drift, linear trend and damped smoothing |

ARIMA is **not implemented**: a dependable fit needs an optimiser and diagnostics that were not built or tested here.

## Uncertainty

80% range = base path ± 1.28 × daily volatility × √(days ahead). "Bullish" and "bearish" are only the edges of that range.

## Backtest (walk-forward, no look-ahead)

At each past origin date the method receives only earlier prices and forecasts the horizon ahead; the result is compared with the actual price. Origins step by a third of the horizon, newest ~300 kept. **The method is chosen on the first half of the origins and its metrics are reported on the second half**, so the numbers shown were not used to choose it. Reported: MAE, RMSE, MAPE, directional accuracy, share of outcomes inside the 80% band, and skill = `1 − MAE / MAE(naive)`. A test proves that changing later prices does not change earlier forecasts.

Horizons: 7D = 5 bars, 30D = 21, 90D = 63, 6M = 126, 1Y = 252. Minimum history: 150 daily bars, otherwise no forecast is produced.

## Reliability labels

Never "reliable". `too few tests` (< 15 held-out points), `no demonstrated skill` (no method beat naive, or the 80% band covered < 60% or > 97% of outcomes), or `limited` (beat naive, band roughly calibrated; limited evidence from past data only).

## Known weaknesses

Backtest origins overlap, so independent evidence is less than the count suggests. Exchange holidays are unknown, so future dates only skip weekends. No news, earnings or macro information is used. Dividends and splits are reflected only if the user's prices are adjusted.
