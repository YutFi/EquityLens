# Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload (base `/`) |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Vitest (unit + smoke) |
| `npm run build` | Typecheck then production build into `dist/` |
| `npm run preview` | Preview server (note: serves at `/`, while the build uses `/EquityLens/`) |

To check a production build the way GitHub Pages serves it, serve `dist/` under an `EquityLens/` directory with any static server.

## Adding a page

Add the route in `src/App.tsx`, an entry in `src/nav.ts` (`status: 'live'` only when it actually works; otherwise `planned` with its phase), and a section in `docs/FORMULAS.md` for any calculation.

## Testing notes

jsdom has no canvas, so `PriceChart` is mocked in `src/App.test.tsx`. Visual and chart behaviour should be checked in a real browser.

## Data-honesty checklist for changes

- Does every new number show where it came from and how fresh it is?
- What does the UI show when the data is missing?
- Could any text imply real-time, verified or causal claims the data doesn't support?
