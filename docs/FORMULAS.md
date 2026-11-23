# Formulas (as implemented in v0.3.0)

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

## Technical indicators (`analytics/indicators.ts`)

| Measure | Definition |
| --- | --- |
| SMA(n) | mean of last n closes; null until n bars |
| EMA(n) | seeded with the SMA of the first n closes, then `α = 2/(n+1)` |
| RSI(14) | Wilder smoothing of average gain/loss; `100 − 100/(1+RS)`; 100 when there are no losses |
| MACD | EMA12 − EMA26; signal = EMA9 of MACD; histogram = MACD − signal |
| Bollinger(20, 2) | SMA20 ± 2 × population standard deviation |
| ATR(14) | Wilder smoothing of true range |
| Momentum(n) | `(C_t / C_{t−n} − 1) × 100` |
| Support / resistance | swing pivots (5 bars each side) over the last 250 bars, merged within 1.5% |

## Ratios (`analytics/ratios.ts`)

All use the latest annual period entered by the user; price is the latest loaded close; market cap = price × shares entered. Blank (with a reason) when an input is missing, earnings are not positive, or the ratio does not apply to financial institutions.

P/E = price ÷ EPS · P/B = price ÷ (equity ÷ shares) · P/S · PEG = P/E ÷ earnings growth % · EV/EBITDA = (market cap + debt − cash) ÷ EBITDA · ROE and ROA on average balances when two periods exist · ROIC = operating income × (1 − 24% assumed tax) ÷ (debt + equity − cash) · debt-to-equity · current and quick ratios · gross, operating, net and FCF margins · dividend yield · payout · revenue and earnings growth. Free cash flow = reported FCF, otherwise operating cash flow − |capex|.

## Financial-health score (`analytics/health.ts`)

Weights: revenue consistency 15, profitability 20, cash-flow quality 15, debt 15, liquidity 10, earnings consistency 10, return on capital 15. Each component maps linearly to 0-100 between documented bad/good thresholds. Missing components are removed and weights re-normalised; under 50% coverage gives "Insufficient data". Banks skip debt and liquidity. Classes: Excellent ≥ 80, Strong ≥ 65, Moderate ≥ 50, Weak ≥ 35, else High risk.

## Valuation (`analytics/valuation.ts`)

- DCF (simplified FCFE): `FCF_t = FCF_0 (1+g)^t`, discounted at r; terminal `FCF_N (1+g_T)/(r − g_T)`; per share = equity value ÷ shares. Refused when FCF ≤ 0, shares missing, or `r ≤ g_T`.
- Gordon dividend model: `D(1+g)/(r − g)`; refused when `r ≤ g` or no dividend.
- Justified P/B (banks): `(ROE − g)/(r − g)` × book value per share.
- Relative: median peer P/E, P/B, P/S (same sector, loaded, at least 3) and the company's own year-end P/E history.
- Fair value = median of applicable base estimates; margin of safety = `(fair − price) / fair`. Defaults (10% discount rate, 3% terminal growth, 5 years) are labelled placeholders.

## Risk (`analytics/risk.ts`)

Volatility 20/60d (annualised), maximum drawdown, historical 1-day 95% VaR (needs ≥ 100 returns), downside deviation, beta = cov/var of daily returns against the benchmark on shared dates (needs ≥ 60). Earnings what-if: costs split fixed/variable, revenue shock scales variable costs, margin and rate shocks applied, net income moves by the after-tax change in operating profit. Labelled hypothetical.

## Opportunities (`analytics/opportunities.ts`)

Priority score = weighted components (health 25, valuation vs peers 20, growth 15, dividend 10, momentum 15, price risk 15) re-normalised over available components; no score under 40% coverage. A category applies only if its defining criterion is evaluable and every evaluable criterion is met (at least two evaluable); warning signals apply if any one is met. "No data" is never counted as met or failed.

## Simulator (`analytics/portfolio.ts`)

Average cost including fees on buys; a sale realises `(price − avg cost) × shares − fees`; dividends = shares × per-share amount − fees (user-entered). Total return = unrealised + realised + dividends, as a percentage of everything ever bought (fees included). Unpriced holdings suppress value and unrealised figures.

## Alerts (`analytics/alerts.ts`)

Price above/below, absolute one-day move, RSI thresholds, volume vs 20-day average, health below a threshold. Evaluated only while the app is open.
