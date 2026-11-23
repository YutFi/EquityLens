# Moomoo local bridge (optional, experimental)

EquityLens can show daily candles and a live quote from **your own Moomoo account** through a small
read-only script that runs on your computer. This page says what it costs, how it works, what is
verified and what is not. Findings were read from Moomoo's published documentation on 2026-11-23.
Re-check them: Moomoo changes quote rights, quotas and prices.

> **Status: untested against a live account.** The build environment had no route to Moomoo. The
> bridge is covered by unit tests against a faithful fake of Moomoo's Python SDK, and the web side by
> unit tests with sample payloads. Whether it works for *your* account and Bursa counters is only
> known once you try it.

## What it costs

| Item | Finding |
|---|---|
| The OpenAPI itself | Documented as free. Moomoo states there is no extra charge for trades placed through OpenAPI. |
| Market data | Needs the matching **quote right** on your account, and some varieties need a purchased quotation card. |
| Malaysia quotes | The Moomoo MY app advertises free 3-level Bursa quotes for account holders, and sells a paid "MY Securities LV2 Season Card" (RM10.99 listed in the app store). **Not confirmed:** whether the free app quotes also apply to API access. Moomoo says API permissions are "not exactly the same as the app". OpenD shows the rights your account actually has. |
| Quotas | Subscription and historical-candle quotas apply and depend on the account. Malaysia-specific values were not verified. The bridge uses snapshots for live quotes (no subscription) and one history request per Fetch. |
| Account | You need a Moomoo account (the documentation says a trading account is no longer required just to log in to OpenD). |

Malaysia support in OpenAPI is recent: Moomoo's changelog lists Singapore, Malaysia and Japan stock
market data in OpenD 10.7.6708 (2026-06-04).

## How it works

```
EquityLens (browser)  --HTTP JSON on 127.0.0.1-->  bridge script  --Moomoo SDK-->  OpenD  --> Moomoo
```

- **OpenD** is Moomoo's gateway program. You install it, log in yourself, and it holds your credentials.
- **`bridge/moomoo_bridge.py`** talks to OpenD with Moomoo's official Python SDK and serves three read-only routes:
  `/health`, `/candles?code=1155&from=YYYY-MM-DD&to=YYYY-MM-DD` and `/quote?code=1155`.
- **EquityLens** only contacts an address on your own computer. Nothing is sent to any other host.

Why not call Moomoo straight from the web page? OpenD must run on your machine, so a static site cannot reach it. Moomoo
also has a newer gateway-free REST/WebSocket API that signs requests with an API key pair; embedding a private key in public
front-end code is unsafe, and browser (CORS) access was not verified, so this project does not use it.

## Setup

1. Install and log in to **OpenD** from Moomoo's developer site. Leave it running.
2. `pip install moomoo-api` (the SDK) with Python 3.9 or newer.
3. From the repository folder: `python3 bridge/moomoo_bridge.py serve`
   Try it first without an account: `python3 bridge/moomoo_bridge.py serve --mock` (synthetic data, clearly labelled).
4. In EquityLens open **Settings → Moomoo local bridge**, tick *Use the Moomoo bridge* and press *Test connection*.
5. Open a Bursa company page: **Fetch from Moomoo bridge** stores up to 3 years of daily bars (replacing that security's stored history); **Live quote** polls every 15 seconds while the page is open and shows today's price on the chart.

If you run EquityLens from somewhere other than `https://yutfi.github.io` or the local dev ports, start the bridge with `--allow-origin <that origin>`.

### CSV fallback (always works)

If your browser blocks a hosted page from reaching localhost, export files instead and import them with the normal import dialog:

```
python3 bridge/moomoo_bridge.py export 1155 5183 --from 2024-01-01 --out-dir moomoo_export
```

## Safety model

- **Read-only.** The script has no trading, order, account or position code (a test asserts this).
- **Loopback only.** The bridge refuses to bind to anything but 127.0.0.1, localhost or ::1, rejects requests whose `Host` header is not loopback (DNS-rebinding defence), and answers browsers only from an origin allow-list. EquityLens refuses to be pointed at a non-loopback address.
- **No credentials** pass through the bridge or the website. Your Moomoo login stays in OpenD.
- **Validation.** The bridge drops rows with missing, non-positive or inconsistent prices; the app validates again and counts rejected rows. Nothing is repaired or invented.
- **Quote vs history.** The live quote is display-only and is never stored or fed to forecasts. Forecasts, ratios and valuation use stored daily bars, so press *Fetch* to store today's bar.

## Data labelling

Moomoo data is shown as **"Moomoo OpenAPI via your local bridge"** and is never labelled *Verified*, because EquityLens cannot independently check it against the exchange. Bars are **unadjusted**; splits, bonus issues and dividends are not reflected. Mock-mode data is labelled *Synthetic demo*, and the app refuses to let it replace real stored data.

## Licensing

Use Moomoo data for your own research. Do not publish, share or commit it, and do not run a public service from it: exchange data redistribution needs a licence. The repository ignores `moomoo_export/` and never ships Moomoo data.

## Not verified / known limits

- Behaviour with a live Moomoo account, and which Bursa counters your quote rights cover.
- The market prefix for Bursa (`MY` by default, set with `--market-prefix`).
- Whether the free Malaysia quotes in the app extend to the API.
- Browser rules for an HTTPS page calling `http://127.0.0.1`: some browsers show a permission prompt for local-network access, and Safari may block it. Allow the prompt, or use the CSV export.
- Daily bars only. Intraday charts, order-book and tick data are not implemented.
- Only Bursa Malaysia equities are wired up in this release.
