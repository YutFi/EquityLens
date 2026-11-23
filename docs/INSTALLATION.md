# Installation

## Requirements

- Node.js 22 or newer and npm
- A modern browser (current Chrome, Edge, Firefox or Safari)

## Steps

```bash
git clone https://github.com/YutFi/EquityLens.git
cd EquityLens
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

## First run

The app starts empty. Use **Settings → Load synthetic demo data** to explore with fictional companies, or **Import data** to load your own OHLCV CSV. No account or key is needed.

## Troubleshooting

- *Blank page after build:* the production build expects to be served under `/EquityLens/`. For a different path, build with `VITE_BASE=/your-path/ npm run build`.
- *Import rejected rows:* open the import report; dates must be ISO unless you choose another order.
