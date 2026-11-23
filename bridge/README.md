# EquityLens Moomoo bridge

Read-only local script that lets the EquityLens web app read daily candles and a live quote from
your own Moomoo account (through Moomoo's OpenD). Full guide, costs and limits:
[docs/MOOMOO_BRIDGE.md](../docs/MOOMOO_BRIDGE.md).

```bash
pip install moomoo-api                      # Moomoo's official SDK (not needed for --mock)
python3 bridge/moomoo_bridge.py serve       # OpenD must be running and logged in
python3 bridge/moomoo_bridge.py serve --mock                # synthetic data, no account needed
python3 bridge/moomoo_bridge.py export 1155 --out-dir moomoo_export   # CSV for the normal import
python3 -m unittest discover -s bridge -v   # tests (no account or network needed)
```

Not verified against a live account. Never place orders, never exposes anything but market data,
binds to loopback only.
