# Deployment (GitHub Pages)

The repository includes `.github/workflows/deploy.yml`, which builds with Node 22, runs typecheck and tests, and publishes `dist/` to GitHub Pages on every push to `main`.

## One-time setup

1. Repository **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually). The site appears at `https://<user>.github.io/EquityLens/`.

## Notes

- The app uses hash routing, so deep links work without server rewrites.
- The Vite base defaults to `/EquityLens/`. If the repository is renamed or a custom domain is used, set `VITE_BASE` in the workflow (e.g. `/` for a custom domain at the root).
- No secrets or environment variables are required.
