# EQUITYLENS
## Global Stock Market Intelligence, Fundamental Analysis, Valuation & Forecasting Platform

**Project reference:** https://yutfi.github.io/arah/

**Developer:** Independent open-source project.

**Primary market:** Bursa Malaysia (KLSE).

**Future markets:** NASDAQ, NYSE, SGX, HKEX and other international exchanges.

**Deployment:** GitHub Pages.

**Technology preference:** React, TypeScript, Vite and open-source JavaScript libraries.

**Visual identity:** Professional Bloomberg-inspired dark financial terminal.

**Product philosophy:** Free forever. Open source. No accounts. No subscriptions. No fabricated financial data.

---

# PART 1 — PRODUCT VISION

## 1.1 What is EquityLens?

EquityLens is a free, open-source stock market intelligence and investment research platform.

Its purpose is to make financial research accessible to everyone, particularly ordinary individuals who want to understand stock markets but do not have extensive financial knowledge.

I want EquityLens to behave like a personal investment research analyst.

It should automatically retrieve available financial information, evaluate company performance, analyse stock movements, identify potentially attractive investment opportunities and explain possible future scenarios.

The platform should reduce the amount of manual research users need to perform.

Instead of users having to understand dozens of complicated financial metrics independently, EquityLens should interpret those metrics and explain what they mean.

For example, a user should be able to open a company and immediately understand:

- Is this company financially healthy?
- Is its revenue growing?
- Is it consistently profitable?
- Does it have excessive debt?
- Is its stock potentially undervalued?
- Is the current share price relatively expensive?
- What could happen to its share price?
- What are the potential upside and downside scenarios?
- What risks should I investigate?
- What actual evidence supports the assessment?

However, EquityLens must never make decisions on behalf of users.

It provides research, analysis, statistical estimates and educational insights.

Users remain responsible for making their own investment decisions.

## 1.2 Product Identity

Name: EquityLens

Suggested tagline:

"See Beyond the Stock Price."

Alternative tagline:

"Understand the Market. Evaluate the Opportunity. Make Your Own Decision."

The product should feel like a professional financial research terminal rather than an ordinary stock price tracking website.

---

# PART 2 — NON-NEGOTIABLE PRINCIPLES

The following requirements are mandatory.

### Free and open source

- Completely free for users.
- Public GitHub repository.
- No subscription.
- No premium membership.
- No paid features.
- No paywalls.
- No mandatory registration.
- No login.
- No payment gateway.
- No mandatory API keys entered by users.
- No paid AI API.
- No mandatory paid backend.
- No mandatory paid database.
- No mandatory paid hosting.

### Privacy

- No unnecessary personal information.
- No mandatory account.
- No mandatory cloud synchronisation.
- Store personal preferences locally.
- Do not sell or transmit personal information.
- Do not include unnecessary tracking.

### Data integrity

- Never fabricate stock prices.
- Never invent company financial statements.
- Never invent company announcements.
- Never present estimated values as actual values.
- Never describe delayed data as real-time data.
- Always identify the source and reporting period.
- Clearly identify missing information.
- Explain limitations of financial calculations.

### Technical requirements

- Deployable using GitHub Pages.
- Responsive across desktop, tablet and mobile.
- Modular and maintainable architecture.
- Open-source dependencies.
- Graceful API failure handling.
- Efficient data retrieval.
- No hidden paid dependencies.

A feature should never be marked complete merely because its interface exists.

It must actually work.

---

# PART 3 — MARKET STRATEGY

## 3.1 Malaysia First

Bursa Malaysia must be the first fully developed market.

Prioritise:

- FTSE Bursa Malaysia KLCI.
- Main Market.
- ACE Market, where information is available.
- Malaysian listed companies.
- Malaysian financial institutions.
- Technology companies.
- Energy companies.
- Healthcare companies.
- Industrial companies.
- Consumer companies.
- Property and construction companies.
- Plantation companies.
- Telecommunications.
- Utilities.

Display stock prices in MYR.

Use appropriate Malaysian financial reporting conventions and company fiscal periods.

## 3.2 Global Expansion

Design the architecture to support international exchanges.

Future priorities:

1. NASDAQ.
2. NYSE.
3. S&P 500.
4. Singapore Exchange.
5. Hong Kong Stock Exchange.
6. London Stock Exchange.
7. Other supported markets.

Every market must have its own exchange configuration.

Support:
- Different currencies.
- Different trading hours.
- Different holidays.
- Different company identifiers.
- Different financial reporting conventions.

Never assume that every market uses the same financial data structure.

## 3.3 Market Selection

Create a market selector in the application header.

Default market: Bursa Malaysia.

Users should be able to change markets without losing the overall application experience.

Clearly display the selected exchange and currency.

---

# PART 4 — VISUAL DESIGN & USER EXPERIENCE

## 4.1 Design Direction

I want a professional Bloomberg-inspired financial terminal.

Do not directly copy Bloomberg's proprietary interface or branding.

Create an original design using similar professional financial research principles.

Visual characteristics:

- Dark-first interface.
- Deep charcoal and near-black backgrounds.
- High-contrast financial information.
- Professional typography.
- Dense but organised financial tables.
- Interactive charts.
- Clear information hierarchy.
- Compact market indicators.
- Consistent spacing.
- Subtle borders.
- Minimal decorative animations.

Suggested visual treatment:

- Dark background.
- Muted secondary text.
- Green for positive movement.
- Red for negative movement.
- Amber for warnings.
- Neutral grey for unavailable information.

Avoid using colour alone to communicate financial status.

Support accessibility and readable contrast.

Provide light mode as an optional alternative, but dark mode should be the default.

## 4.2 Navigation

Create the following navigation structure:

1. Overview
2. Markets
3. Discover
4. Opportunities
5. Stock Screener
6. Company Research
7. Valuation
8. Forecasting
9. Comparison
10. Sector Intelligence
11. Investment Simulator
12. Watchlist
13. Methodology
14. Data Sources
15. Settings

Use a professional sidebar on desktop and a suitable responsive navigation system on mobile.

## 4.3 Two Analysis Levels

This is an important product requirement.

Create two presentation levels:

**Beginner Mode**

Explain information in simple language.

For example:

"Company revenue increased by 15% compared with the previous year. This suggests the business is generating more sales. However, net profit declined, indicating that higher revenue has not translated into higher profitability."

**Advanced Mode**

Display:
- Financial ratios.
- Historical financial statements.
- Calculation formulas.
- Valuation assumptions.
- Statistical indicators.
- Forecast model details.
- Historical backtesting.
- Raw financial metrics.

Users must be able to switch between these levels.

Do not hide important risk information from beginners.

---

# PART 5 — MAIN MARKET DASHBOARD

Build a comprehensive market overview.

## 5.1 Market Snapshot

Display:

- Latest available market index.
- Index movement.
- Daily percentage change.
- Trading volume.
- Market capitalisation, where available.
- Number of advancing stocks.
- Number of declining stocks.
- Number of unchanged stocks.
- Market status.
- Last updated timestamp.

## 5.2 Market Movers

Display:

- Top gainers.
- Top losers.
- Most actively traded.
- Highest trading volume.
- Unusual volume.
- Highest volatility.
- Significant price movements.

Allow sorting and filtering.

## 5.3 Market Heatmap

Build an interactive heatmap.

Users should be able to examine:
- Individual companies.
- Sectors.
- Market capitalisation.
- Percentage movements.
- Relative market performance.

## 5.4 Market Intelligence Summary

Generate a data-supported market summary.

Example:

"The Malaysian banking sector is showing positive price momentum. However, trading activity remains below its recent average."

Provide the supporting evidence.

Do not generate unsupported explanations of why a stock moved.

Distinguish between observed price movements and confirmed causal events.

## 5.5 Benchmark Tracking

Compare stock and sector performance against:

- FBM KLCI.
- Relevant sector benchmarks.
- S&P 500 for US stocks.
- Other available market indices.

Display absolute returns and relative performance.

---

# PART 6 — STOCK DISCOVERY

Create a powerful stock discovery system.

Allow users to search companies using:

- Company name.
- Ticker.
- Exchange.
- Industry.
- Sector.

Provide filters:

- Stock price.
- Market capitalisation.
- P/E ratio.
- P/B ratio.
- Revenue growth.
- Profit growth.
- Dividend yield.
- Financial health.
- Debt level.
- Technical momentum.
- Valuation.

Provide sortable stock tables.

Every company result should display its data availability status.

---

# PART 7 — COMPANY RESEARCH

Every supported company must have a dedicated research page.

## 7.1 Company Profile

Display:

- Company name.
- Ticker.
- Exchange.
- Sector.
- Industry.
- Company description.
- Market capitalisation.
- Latest stock price.
- Shares outstanding.
- Headquarters, where available.
- Company website, where available.

## 7.2 Financial Statements

Retrieve and display historical financial statements.

### Income statement

- Revenue.
- Cost of revenue.
- Gross profit.
- Operating expenses.
- Operating income.
- Net income.
- Earnings per share.

### Balance sheet

- Total assets.
- Current assets.
- Total liabilities.
- Current liabilities.
- Total debt.
- Shareholders' equity.
- Cash and cash equivalents.

### Cash flow

- Operating cash flow.
- Investing cash flow.
- Financing cash flow.
- Capital expenditure.
- Free cash flow.

Provide annual and quarterly views wherever reliable data exists.

## 7.3 Financial Ratios

Calculate:

- P/E.
- P/B.
- P/S.
- PEG, where applicable.
- EV/EBITDA, where available.
- ROE.
- ROA.
- ROIC.
- Debt-to-Equity.
- Current Ratio.
- Quick Ratio.
- Gross Margin.
- Operating Margin.
- Net Profit Margin.
- Dividend Yield.
- Revenue Growth.
- Earnings Growth.

Document the formula and data period for each ratio.

Handle negative earnings and other cases where common ratios become meaningless.

Do not display misleading ratios simply to fill the dashboard.

## 7.4 Financial Health Assessment

Build a transparent 0–100 scoring model.

Evaluate:

1. Revenue consistency.
2. Profitability.
3. Cash flow quality.
4. Debt management.
5. Liquidity.
6. Earnings consistency.
7. Return on capital.

Possible classifications:

- Excellent.
- Strong.
- Moderate.
- Weak.
- High Risk.

Show the score breakdown.

Explain what caused the score.

Allow users to inspect the underlying metrics.

Do not treat missing information as poor financial performance.

Use sector-aware comparisons where appropriate.

Financial institutions must have suitable specialised metrics rather than blindly applying industrial-company debt and liquidity ratios.

---

# PART 8 — COMPANY VALUATION

Create an independent valuation engine.

## 8.1 Discounted Cash Flow

Implement DCF valuation.

Consider:
- Historical free cash flow.
- Revenue growth.
- Operating margins.
- Tax assumptions.
- Capital expenditure.
- Working capital.
- Discount rate.
- Terminal growth.
- Shares outstanding.

Display all assumptions.

## 8.2 Relative Valuation

Compare:
- P/E.
- P/B.
- P/S.
- EV/EBITDA.

Use relevant industry peers and historical company valuation.

## 8.3 Dividend Discount Model

For appropriate dividend-paying companies, calculate estimated value using dividend projections.

## 8.4 Valuation Scenarios

Show:

- Conservative valuation.
- Base valuation.
- Optimistic valuation.

Display:

- Estimated fair value.
- Latest market price.
- Estimated upside or downside.
- Margin of safety.
- Valuation assumptions.

Allow users to adjust assumptions.

For banks and other financial institutions, use valuation methods suitable for their business models.

Never treat an estimated fair value as a confirmed market price.

Clearly explain valuation limitations.

---

# PART 9 — TECHNICAL ANALYSIS

Implement:

- SMA.
- EMA.
- RSI.
- MACD.
- Bollinger Bands.
- ATR.
- Trading volume.
- Support and resistance.
- Historical volatility.
- Momentum.

Provide candlestick charts.

Allow:
- Daily intervals.
- Weekly intervals.
- Monthly intervals.

Historical views:
- 1 month.
- 3 months.
- 6 months.
- 1 year.
- 3 years.
- 5 years.
- Maximum available history.

Explain technical indicators in beginner-friendly language.

Provide the actual calculated values in advanced mode.

Account for adjusted prices and corporate actions.

---

# PART 10 — STOCK FORECASTING ENGINE

This is a core EquityLens feature.

Develop a transparent statistical forecasting engine.

The application should estimate possible future price movements based on historical market observations.

It must not invent future prices or claim certainty.

## 10.1 Forecasting Methods

Investigate and implement appropriate methods:

- Linear regression.
- Moving average forecasting.
- Exponential smoothing.
- ARIMA.
- Statistical ensemble models.
- Volatility analysis.
- Trend analysis.

Use only models that can be implemented and validated properly.

Do not use a complicated model simply to make the application look sophisticated.

## 10.2 Forecast Horizons

Provide:

- 7 days.
- 30 days.
- 90 days.
- 6 months.
- 1 year.

Show a lower confidence level or explicitly state when longer forecasts are less reliable.

## 10.3 Three Scenarios

For every stock, show:

**Bullish scenario**

What could happen if favourable market and company conditions continue.

**Base scenario**

The central statistical estimate under stated assumptions.

**Bearish scenario**

What could happen if negative conditions occur.

For example:

Latest price: RM2.50.

30-day illustrative forecast:
- Bullish: RM2.80.
- Base: RM2.60.
- Bearish: RM2.30.

Actual figures must come from the forecasting model, not manually invented examples.

Display potential percentage changes.

## 10.4 Forecast Chart

Display:

- Historical stock price.
- Forecast trajectory.
- Upper uncertainty interval.
- Lower uncertainty interval.
- Forecast horizon.
- Actual versus forecast comparison.

Visually distinguish historical observations from estimates.

## 10.5 Forecast Reliability

Display:

- MAE.
- RMSE.
- MAPE, where appropriate.
- Directional accuracy.
- Prediction interval coverage.
- Number of historical testing observations.

Use walk-forward backtesting.

Prevent:
- Look-ahead bias.
- Data leakage.
- Overfitting.
- Future information contamination.

Compare against simple baseline forecasting methods.

If the forecasting model is unreliable, clearly communicate this.

A forecast should never be displayed without information about its limitations.

---

# PART 11 — INVESTMENT OPPORTUNITY ENGINE

Develop an automated investment research scanner.

It should identify companies that deserve additional research.

## 11.1 Opportunity Categories

### Undervalued Opportunities

Look for:
- Attractive relative valuation.
- Strong fundamentals.
- Positive cash flow.
- Reasonable debt.
- Sustainable profitability.

### Growth Opportunities

Look for:
- Revenue growth.
- Profit growth.
- EPS improvement.
- Improving ROIC.
- Sustainable business performance.

### Dividend Opportunities

Look for:
- Consistent dividends.
- Attractive yield.
- Sustainable payout ratio.
- Dividend growth.
- Strong cash flow.

### Momentum Opportunities

Look for:
- Positive price momentum.
- Increasing volume.
- Technical strength.
- Relative outperformance.

### Recovery Opportunities

Look for:
- Improving financial statements.
- Debt reduction.
- Profit recovery.
- Improving margins.
- Better cash flow.

### Financial Warning Signals

Identify:
- Declining earnings.
- Weak liquidity.
- Excessive debt.
- Deteriorating cash flow.
- Consecutive losses.
- Financial deterioration.

## 11.2 Opportunity Scoring

Build a transparent scoring engine.

Evaluate:
- Financial health.
- Valuation.
- Growth.
- Dividend quality.
- Technical momentum.
- Risk.

Display component scores and explain how they are calculated.

Use sector-aware criteria.

Do not confuse cheap valuation with undervaluation.

Do not confuse momentum with fundamental quality.

Do not claim that a high score guarantees investment returns.

---

# PART 12 — RISK ANALYSIS

Create a dedicated risk intelligence module.

Evaluate:

- Historical volatility.
- Maximum drawdown.
- Financial leverage.
- Liquidity.
- Earnings stability.
- Cash flow stability.
- Dividend sustainability.
- Sector concentration.
- Currency exposure.
- Valuation sensitivity.

Implement scenario testing.

Examples:

- Revenue decreases by 10%.
- Operating margin decreases.
- Interest rates increase.
- Stock price declines by 10%, 20% or 30%.
- Currency exchange rates change.

Show the implications using transparent assumptions.

Clearly distinguish hypothetical scenario analysis from an actual forecast.

---

# PART 13 — SECTOR INTELLIGENCE

Create a dedicated sector research dashboard.

Analyse:

- Banking.
- Technology.
- Healthcare.
- Energy.
- Telecommunications.
- Consumer products.
- Industrial products.
- Construction.
- Property.
- Plantation.
- Utilities.
- Other supported industries.

Display:

- Sector performance.
- Revenue trends.
- Profitability.
- Valuation.
- Market capitalisation.
- Industry leaders.
- Weaker performers.
- Relative performance.

Allow users to compare companies within the same industry.

---

# PART 14 — COMPANY EVENTS & NEWS

Retrieve available public information.

Include:

- Earnings announcements.
- Quarterly results.
- Annual reports.
- Dividend announcements.
- Corporate actions.
- Rights issues.
- Bonus issues.
- Share buybacks.
- Mergers and acquisitions.
- Material announcements.
- Significant regulatory developments.

Display:

- Headline.
- Publication date.
- Company.
- Original source.
- Link to original information.

Prioritise official company disclosures and exchange announcements.

Clearly distinguish official announcements from third-party news.

Never fabricate news.

Do not claim continuous monitoring if information is only retrieved when the application refreshes.

---

# PART 15 — STOCK COMPARISON

Allow users to compare up to five companies.

Compare:

- Revenue.
- Profit.
- EPS.
- Growth.
- P/E.
- P/B.
- ROE.
- ROA.
- Debt.
- Cash flow.
- Dividend yield.
- Historical returns.
- Financial health.
- Fair value.
- Technical momentum.
- Risk.

Provide visual comparison charts.

Generate a simple explanation of the differences.

Ensure reporting periods and currency are comparable.

---

# PART 16 — INVESTMENT SIMULATOR

Build a hypothetical investment simulator.

No brokerage integration.

Users should be able to:

- Select a stock.
- Enter purchase price.
- Enter number of shares.
- Enter purchase date.
- Simulate additional purchases.
- Calculate average purchase price.
- Calculate portfolio value.
- Calculate unrealised profit or loss.
- Include dividends where reliable information is available.
- Include transaction costs where supported.

Allow multiple hypothetical portfolios.

Use IndexedDB or localStorage.

Clearly label simulated investments.

---

# PART 17 — WATCHLIST & ALERTS

Build a local-first watchlist.

Users can:

- Add stocks.
- Remove stocks.
- Organise stocks.
- Track prices.
- Track financial performance.
- Track technical indicators.

Optional alerts:

- Price target reached.
- Price movement percentage.
- RSI threshold.
- Unusual volume.
- New financial statements.
- New company announcements.
- Deteriorating company health.

Use browser notifications where supported.

No accounts required.

Explain that browser-based alerts generally require the website to remain active and do not guarantee background monitoring.

---

# PART 18 — RESEARCH ASSISTANT

Build an interactive research assistant without mandatory paid AI services.

It should answer questions such as:

- Is this company financially healthy?
- Why has its stock price decreased?
- Is the company potentially undervalued?
- What are its financial weaknesses?
- How has revenue changed?
- Is its dividend sustainable?
- Which competitors are stronger?
- What are the potential risks?

Use retrieved information and calculated metrics.

Build a rule-based explanation engine.

Do not simulate an AI conversation with fabricated answers.

Every important conclusion must reference supporting data.

If the information is insufficient, say so.

---

# PART 19 — DATA PROVIDERS & DATA ARCHITECTURE

This section is critical.

Investigate legitimate, free financial information sources.

Potential sources:

### Bursa Malaysia

Investigate public:
- Company announcements.
- Financial statements.
- Corporate disclosures.
- Market information.
- Annual reports.

### SEC EDGAR

Use official public APIs for:
- Company filings.
- XBRL financial information.
- Annual reports.
- Quarterly reports.

### Stooq

Investigate historical market data availability and terms.

### Yahoo Finance

Investigate availability of publicly accessible market data endpoints.

Do not assume unofficial endpoints are supported or unrestricted.

### Other providers

Investigate legitimate free alternatives.

For every provider, document:

- Available data.
- Historical coverage.
- Update frequency.
- Real-time or delayed status.
- API key requirements.
- Rate limits.
- Licensing.
- Redistribution restrictions.
- Browser accessibility.
- Known reliability limitations.

## Provider architecture

Create a modular data provider system.

Each provider should be implemented as an independent adapter.

For example:

- Bursa provider.
- SEC provider.
- Historical price provider.
- Financial statement provider.
- Corporate announcement provider.

Allow providers to be replaced without rewriting the application.

## Data normalisation

Create a standard internal data model.

Normalise:
- Tickers.
- Exchange identifiers.
- Currency.
- Financial periods.
- Price adjustments.
- Financial statement units.
- Timestamps.

Avoid mixing quarterly and annual financial figures.

Avoid double-counting dividends.

Handle stock splits and other corporate actions.

## Data quality indicators

Every dataset must identify:

- Source.
- Last updated.
- Observation date.
- Currency.
- Reporting period.
- Data frequency.
- Status.

Possible statuses:

- Verified.
- Delayed.
- Historical.
- Estimated.
- Incomplete.
- Stale.
- Unavailable.

Never present estimated or incomplete information as verified data.

---

# PART 20 — GITHUB PAGES ARCHITECTURE

The application must be designed around static hosting limitations.

Preferred stack:

- React.
- TypeScript.
- Vite.
- TradingView Lightweight Charts.
- Chart.js where useful.
- IndexedDB.
- localStorage.
- GitHub Pages.

GitHub Pages cannot execute a conventional backend.

Therefore:

Prioritise:
- Browser-accessible public APIs.
- Browser-side financial calculations.
- Static datasets where permitted.
- Local storage.
- Public data sources.
- Optional scheduled public dataset generation only where legally and technically appropriate.

Do not expose secret API keys.

Do not assume a frontend application can securely store confidential credentials.

Do not implement paid proxy services.

Do not introduce a mandatory backend simply to make a feature work.

If a feature cannot be implemented reliably with the free static architecture, clearly explain the limitation and provide the best legitimate alternative.

## Optional data updates

Investigate GitHub Actions for scheduled updates of permitted public datasets.

Consider:
- Public repository workflows.
- Free usage quotas.
- Source licensing.
- Data freshness.
- Build frequency.

Do not commit restricted or unauthorised financial datasets.

The application must remain useful even if scheduled updates are unavailable.

---

# PART 21 — USER DATA & PRIVACY

No account system.

Store preferences locally.

Support:

- Watchlists.
- Simulated portfolios.
- Preferred exchange.
- Preferred currency.
- Chart settings.
- Dark/light theme.
- Alert preferences.

Provide:
- Export local data.
- Import local data.
- Backup settings.
- Clear application data.

Do not send personal watchlists to external servers.

---

# PART 22 — PERFORMANCE & ERROR HANDLING

Implement:

- Lazy loading.
- Efficient chart rendering.
- Request caching.
- Request deduplication.
- Rate-limit management.
- Sensible retry logic.
- Graceful API failure handling.
- Loading states.
- Empty states.
- Error messages.
- Responsive rendering.
- Offline-friendly cached views.

Always identify when cached information is being displayed.

An unavailable provider must not crash the entire application.

---

# PART 23 — PROJECT DOCUMENTATION

Create a professional public GitHub repository.

Include:

- README.md.
- LICENSE.
- CONTRIBUTING.md.
- CHANGELOG.md.
- .gitignore.
- Architecture documentation.
- Installation guide.
- Development guide.
- Deployment guide.
- Financial formula documentation.
- Forecasting methodology.
- Data provider documentation.
- Data licensing documentation.
- Known limitations.

Use MIT License if compatible with dependencies and the project code.

Do not claim ownership of third-party financial data.

---

# PART 24 — INVESTMENT DISCLAIMER

Display the following disclaimer prominently:

"EquityLens is an independent financial research and educational platform. Financial information, calculations, assessments and forecasts are provided for informational purposes only. Historical performance does not guarantee future results. Forecasts are estimates based on available data and assumptions and may be inaccurate. Nothing on this platform constitutes personalised financial advice or a recommendation to buy or sell any financial instrument. Users are responsible for conducting their own research and making independent investment decisions."

---

# PART 25 — DEVELOPMENT ROADMAP

Build the project in controlled phases.

Do not attempt to generate the entire application in one implementation step.

## PHASE 1 — FOUNDATION

Build:
- Application architecture.
- Design system.
- Responsive interface.
- Dark theme.
- Market selector.
- Company search.
- Bursa Malaysia market dashboard.
- Historical stock charts.
- Data provider adapters.
- Data quality indicators.

Deliverable: A functioning Malaysia-first market dashboard using genuine available data.

## PHASE 2 — COMPANY INTELLIGENCE

Build:
- Company profiles.
- Financial statements.
- Financial ratios.
- Financial health assessment.
- Historical financial charts.
- Dividend analysis.

Deliverable: Functional company research pages.

## PHASE 3 — VALUATION & TECHNICAL ANALYSIS

Build:
- Technical indicators.
- DCF.
- Relative valuation.
- Dividend valuation.
- Fair value.
- Margin of safety.

Deliverable: Functional valuation and technical research tools.

## PHASE 4 — FORECASTING

Build:
- Statistical forecasting.
- Bullish, base and bearish scenarios.
- Forecast charts.
- Backtesting.
- Reliability measurements.
- Uncertainty intervals.

Deliverable: A tested and transparent forecasting engine.

## PHASE 5 — INVESTMENT OPPORTUNITIES

Build:
- Opportunity scanner.
- Financial health rankings.
- Growth screening.
- Dividend screening.
- Momentum screening.
- Recovery screening.
- Financial warnings.

Deliverable: Functional automated stock discovery.

## PHASE 6 — INVESTOR TOOLS

Build:
- Stock comparison.
- Investment simulator.
- Watchlists.
- Alerts.
- Local storage.
- Import and export.

Deliverable: Complete account-free research experience.

## PHASE 7 — GLOBAL EXPANSION

Build:
- NASDAQ.
- NYSE.
- SGX.
- HKEX.

Deliverable: Modular multi-market platform.

## PHASE 8 — TESTING & PUBLIC DEPLOYMENT

Perform:
- Data validation.
- Calculation testing.
- Forecast validation.
- UI testing.
- Mobile testing.
- Accessibility testing.
- Performance testing.
- Security review.
- GitHub Pages deployment testing.

Deliverable: A stable publicly accessible open-source platform.

---

# PART 26 — ACCEPTANCE CRITERIA

A visually attractive dashboard is not sufficient.

The project must satisfy these requirements:

1. Bursa Malaysia is the primary supported market.
2. Supported companies can be searched.
3. Genuine market data can be retrieved.
4. Historical stock charts work.
5. Financial ratios are correctly calculated.
6. Company health scores have documented methodology.
7. Valuation models use explicit assumptions.
8. Forecasts are based on actual historical observations.
9. Forecasts are tested through backtesting.
10. Opportunity rankings are transparent.
11. Financial warnings are evidence-based.
12. Companies can be compared.
13. Watchlists work without accounts.
14. Investment simulations work locally.
15. Data sources and timestamps are visible.
16. Missing data is handled honestly.
17. The application works without registration.
18. The application can be deployed on GitHub Pages.
19. No mandatory paid services are required.
20. No fabricated financial information is presented as fact.

---

# PART 27 — HOW CLAUDE SHOULD EXECUTE THIS PROJECT

Act as a senior full-stack engineer, financial data analyst, quantitative researcher and professional UI/UX designer.

I want you to develop a real application, not just produce a concept or a visual mockup.

## Step 1: Inspect the reference

Inspect:

https://yutfi.github.io/arah/

Understand its public-facing design and structure where accessible.

Do not assume access to its private source code.

Use it as a reference for the deployment approach and project direction.

## Step 2: Technical feasibility

Before development:

- Investigate free data providers.
- Identify actual data availability.
- Verify provider restrictions.
- Determine what can work on GitHub Pages.
- Identify any backend limitations.
- Design a modular architecture.
- Explain important trade-offs.

Do not promise unrestricted real-time Bursa market data if it cannot be obtained legitimately for free.

## Step 3: Create the project

Create the project structure.

Set up:
- React.
- TypeScript.
- Vite.
- Styling system.
- Routing.
- Chart libraries.
- Data adapters.
- Local storage.
- GitHub Pages configuration.

## Step 4: Build Phase 1

Begin with the Malaysia-first market dashboard.

Prioritise working functionality and genuine data.

Create realistic loading, error, empty and unavailable states.

## Step 5: Validate everything

Test:
- API connections.
- Data correctness.
- Financial calculations.
- Charts.
- Responsive layout.
- Navigation.
- Local storage.
- Deployment.

Do not move to the next phase until the current phase is stable.

## Step 6: Maintain the project

Keep the code modular.

Update documentation.

Preserve working functionality.

Do not silently replace real data with mock data.

If mock data is needed during development, label it clearly.

Never claim that a feature works unless it has been tested.

---

# PART 28 — FINAL PRODUCT PHILOSOPHY

EquityLens should become a genuinely useful, independent and free financial research platform.

It should help users understand:

- What is happening in the market?
- Which companies are performing well?
- Which companies have strong fundamentals?
- Which companies are potentially undervalued?
- Which companies have sustainable growth?
- Which companies offer attractive dividends?
- Which companies have financial weaknesses?
- What could happen to stock prices?
- What are the potential upside and downside scenarios?
- How reliable are the forecasts?
- What evidence supports the analysis?

The application should not pressure people into investing.

It should empower them with better information.

**Core philosophy:**

"Don't tell people what to buy. Give them the information, analysis and understanding to know what they are buying."

Build EquityLens as a professional, Malaysia-first, globally expandable, free and open-source investment intelligence platform.

**Start by investigating the data sources and technical architecture, then implement Phase 1.**