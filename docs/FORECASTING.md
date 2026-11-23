# Forecasting methodology

**Status: planned for Phase 4. Nothing here is implemented in v0.1.0, and the Forecasting page is a labelled placeholder.**

## Intended approach

- Forecasts are **scenario-based ranges**, not single-point price targets.
- Methods will be simple, transparent and documented (e.g. statistical baselines, volatility-based ranges, optional fundamental scenarios), each with its assumptions shown.
- Every forecast will state its inputs, the data it used, its horizon and its limits.
- **Backtesting first:** a method is only offered if it is evaluated out-of-sample against a naive baseline, and the results (including when it does worse) are displayed.
- Forecasts will be labelled **Estimated**, never "verified", and will carry the standard disclaimer.
- No forecast will be produced when data is too short or too stale; the page will say why.

## Not promised

No prediction of future prices is guaranteed to be accurate, and the platform will not present forecasts as advice or recommendations.
