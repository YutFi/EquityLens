# Formulas (as implemented in v0.1.0)

Only calculations that exist in code are listed. Each has unit tests under `src/analytics/` or `src/data/`.

| Measure | Definition | Edge cases |
| --- | --- | --- |
| One-day change % | `(C_t − C_{t−1}) / C_{t−1} × 100` | Null if prior close is 0 or missing |
| Period return | Close on the last trading day on/before `(latest date − window)` vs latest close | Null if history does not reach back that far (never extrapolated) |
| Relative performance | stock period return − benchmark period return | Null if either is null |
| Annualised volatility (20d) | `stdev(last 20 daily log returns) × √252 × 100` (sample stdev) | Null with fewer than 20 returns |
| Maximum drawdown | largest peak-to-trough decline in close over the range | 0 for monotonic rises |
| Volume vs 20-day average | latest volume ÷ mean of previous 20 volumes | Needs ≥10 prior bars with volume |
| Traded value | close × volume of latest bar | Used for heatmap sizing; not market cap |
| Breadth | counts of comparable securities up / down / unchanged | Only securities on the latest common date |
| Weekly / monthly bars | O = first open, H = max high, L = min low, C = last close, V = sum; dated on last trading day; weeks start Monday | |
| Adjusted prices | when every row has adj close, OHLC × (adj / close) | Otherwise prices shown as supplied |
| Frequency detection | median spacing of dates | |
| Gap detection | gap of ≥10 weekdays between bars flags "incomplete" | Public holidays unknown |
| Stale | latest bar older than 7 days | |

Planned formula sections (not implemented): financial ratios, financial-health score, DCF, relative valuation, dividend valuation, technical indicators, forecast and backtest metrics.
