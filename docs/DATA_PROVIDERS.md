# Data provider investigation

Reviewed 2026-11-23. This build's sandbox could not reach market-data hosts, so nothing below was verified by live calls; findings come from public documentation and community reports and **must be re-verified before relying on them**.

## Requirement

Free, legitimate, callable from a browser on a static site (CORS), no mandatory API key, no paid proxy, usable for Bursa Malaysia, with terms that allow this use.

## Findings

| Source | Outcome |
| --- | --- |
| **Local CSV import** | Integrated. User supplies data they are entitled to use. |
| **Bursa Malaysia website** | Not integrated. Public pages are for human viewing; no documented public API; terms and CORS not established. Do not scrape without written permission. |
| **Yahoo Finance (unofficial endpoints)** | Not integrated. No official public API or CORS permission for browsers, and terms restrict automated and redistributive use. Community libraries rely on server-side access and break without notice. |
| **Stooq** | Not integrated. Bulk CSV downloads historically available, but programmatic access now reported to require an API key/captcha step, and Malaysian coverage is not assured. |
| **SEC EDGAR** | Not applicable to Bursa (US filings only). Candidate for Phase 7 US fundamentals (free, no key, requires a descriptive User-Agent; browser CORS to be verified). |
| **EODHD (EOD Historical Data)** | **Integrated as optional and experimental** (`src/data/providers/eodhd.ts`). Vendor documentation lists the KLSE exchange (symbols like `1155.KLSE`, endpoint `/api/eod/{code}.KLSE`); free plan documented as 20 calls/day, last 12 months, personal use. User supplies their own key (browser only, never exported). Parser and error mapping are unit-tested with sample payloads; **no live call was possible** from the build sandbox, so CORS and free-plan Bursa coverage are unconfirmed. |
| **Twelve Data / Alpha Vantage** | Not integrated. Twelve Data lists Bursa (XKLS) but on a paid plan; no Bursa evidence found for Alpha Vantage. |

## Options for live data (need a decision)

1. **Keep bring-your-own CSV** (current).
2. **Scheduled GitHub Action** that fetches from a *licensed* source and commits static JSON to the repo. Needs a source whose terms permit redistribution; free tiers usually do not.
3. **Optional user-supplied API key** stored only in the browser, for vendors that allow browser calls. *(Implemented for EODHD, experimental.)*

Whichever route is chosen, every dataset must keep showing its true source, observation date and status, and delayed data must never be described as real-time.

## Financial statements

No free, licensed, browser-callable source of Bursa company financials was found. Statements are therefore typed or imported by the user (`src/data/fundamentalsCsv.ts`) and labelled as such.
