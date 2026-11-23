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
| **Keyed vendors (e.g. free tiers)** | Not integrated. Require keys, have tight limits and licences that often forbid redistribution. Possible later as an optional, user-supplied-key adapter. |

## Options for live data (need a decision)

1. **Keep bring-your-own CSV** (current).
2. **Scheduled GitHub Action** that fetches from a *licensed* source and commits static JSON to the repo. Needs a source whose terms permit redistribution; free tiers usually do not.
3. **Optional user-supplied API key** stored only in the browser, for vendors that allow browser calls.

Whichever route is chosen, every dataset must keep showing its true source, observation date and status, and delayed data must never be described as real-time.
