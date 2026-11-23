# Contributing to EquityLens

Thanks for helping. A few ground rules matter more here than in most projects because the app presents financial information.

## Non-negotiable rules

1. **Never fabricate data.** No invented prices, statements, announcements, news or "plausible" fillers. Missing data is shown as missing.
2. **Never mislabel data.** Estimated, synthetic, delayed, stale and user-imported data must carry their true status badge. Do not mark user-imported data "verified".
3. **Do not mark a planned feature as complete.** Placeholders must say "Planned".
4. **No credentials, tracking, accounts or paid services** in the default build. Optional user-supplied keys are acceptable later if stored locally and clearly explained.
5. **No scraping of sources whose terms forbid it.** Check licensing first and record the finding in `docs/DATA_PROVIDERS.md`.
6. **No causal claims from price movement.** Describe what changed, not why, unless a confirmed event source is loaded and cited.
7. **Keep the disclaimer** visible. Do not weaken its wording.

## Workflow

```bash
npm install
npm run typecheck && npm test && npm run build
```

All three must pass before a pull request. New calculations need unit tests and an entry in `docs/FORMULAS.md` stating the formula, inputs, units and edge cases.

## Adding a data provider

Implement the `PriceProvider` interface in `src/data/providers/`, register it in `registry.ts`, and document it in `src/data/providerCatalog.ts` and `docs/DATA_PROVIDERS.md` (terms, rate limits, CORS behaviour, redistribution rights). A failing provider must never crash the app.

## Style

TypeScript strict mode, no `any` without a comment, accessible markup (labels, roles, keyboard support), no colour-only meaning, original design (no copying of other products' branding or layouts).

## Reporting issues

Please include browser, steps to reproduce and, for data problems, a minimal sample file (only if you have the right to share it).
