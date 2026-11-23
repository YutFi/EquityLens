#!/usr/bin/env python3
"""EquityLens <-> Moomoo local bridge (read-only market data).

Why this exists: Moomoo's OpenD gateway has to run on your own computer, and a static website on
GitHub Pages cannot talk to it directly. This small script runs next to OpenD, uses your own
Moomoo login and data rights, and serves daily candles and the latest quote as JSON on
http://127.0.0.1:<port> for the EquityLens web app (or exports them to CSV).

Safety rules built in:
  * Read-only. There is no trading, order, account or position code in this file.
  * Binds to a loopback address only, checks the Host header (DNS-rebinding defence) and only
    answers browsers whose Origin is on an allow-list.
  * Your Moomoo credentials stay in OpenD. This script never sees or stores them.
  * Data is never written anywhere except the CSV files you explicitly ask for.

Status: NOT verified against a live Moomoo account in the environment where it was written (no
network route to Moomoo). It follows the published OpenAPI Python SDK (`moomoo-api`) and is unit
tested against a faithful fake of that SDK. The Malaysia market prefix ("MY") is an assumption
taken from the SDK's market list; change it with --market-prefix if your OpenD reports otherwise.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import math
import os
import random
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List, Optional, Sequence
from urllib.parse import parse_qs, urlparse

VERSION = "0.1.0"
DEFAULT_PORT = 8765
DEFAULT_OPEND_PORT = 11111
DEFAULT_ORIGINS = (
    "https://yutfi.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
)
LOOPBACK_HOSTS = ("127.0.0.1", "localhost", "::1")
CODE_RE = re.compile(r"^[0-9A-Za-z]{1,12}$")
MAX_SPAN_DAYS = 20 * 366


class BridgeError(Exception):
    """An error the app can show to the user. `code` is stable; `message` is plain English."""

    def __init__(self, code: str, message: str, status: int = 502) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


# --------------------------------------------------------------------------------------------
# Shared helpers
# --------------------------------------------------------------------------------------------

def parse_date(value: str, field: str) -> dt.date:
    try:
        return dt.datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise BridgeError("bad-request", f"'{field}' must be a date like 2025-01-31.", 400)


def clean_number(x: Any) -> Optional[float]:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) else None


def normalise_bar(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Turns one SDK row into the bridge's bar shape, or None if the row is not clean.

    Rows are rejected, never repaired: a price that is missing, non-positive or inconsistent
    (high below low) is dropped rather than guessed.
    """
    stamp = str(row.get("time_key") or row.get("date") or "")[:10]
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", stamp):
        return None
    o, h, l, c = (clean_number(row.get(k)) for k in ("open", "high", "low", "close"))
    if None in (o, h, l, c) or min(o, h, l, c) <= 0 or h < l:  # type: ignore[type-var]
        return None
    v = clean_number(row.get("volume"))
    return {"t": stamp, "o": o, "h": h, "l": l, "c": c, "v": v if v is not None and v >= 0 else None}


def finalise_bars(rows: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    by_date: Dict[str, Dict[str, Any]] = {}
    rejected = 0
    for row in rows:
        bar = normalise_bar(row)
        if bar is None:
            rejected += 1
        else:
            by_date[bar["t"]] = bar
    return {"bars": [by_date[k] for k in sorted(by_date)], "rejected": rejected}


# --------------------------------------------------------------------------------------------
# Backends
# --------------------------------------------------------------------------------------------

class Backend:
    name = "base"

    def health(self) -> Dict[str, Any]:  # pragma: no cover - interface
        raise NotImplementedError

    def candles(self, code: str, start: dt.date, end: dt.date) -> Dict[str, Any]:  # pragma: no cover
        raise NotImplementedError

    def quote(self, code: str) -> Dict[str, Any]:  # pragma: no cover
        raise NotImplementedError

    def close(self) -> None:
        return None


class MockBackend(Backend):
    """Deterministic synthetic data so the app and bridge can be tried without a Moomoo account.

    The responses are labelled source="mock" so EquityLens shows them as demo data and never as
    real market prices.
    """

    name = "mock"

    def _series(self, code: str, start: dt.date, end: dt.date) -> List[Dict[str, Any]]:
        seed = int(hashlib.sha256(code.encode()).hexdigest()[:8], 16)
        rng = random.Random(seed)
        price = 1.0 + (seed % 900) / 100.0
        day = dt.date(2020, 1, 1)
        rows: List[Dict[str, Any]] = []
        while day <= end:
            if day.weekday() < 5:
                drift = rng.gauss(0.0002, 0.012)
                o = price
                c = max(0.05, o * (1 + drift))
                h = max(o, c) * (1 + abs(rng.gauss(0, 0.004)))
                l = min(o, c) * (1 - abs(rng.gauss(0, 0.004)))
                rows.append({"time_key": f"{day.isoformat()} 00:00:00", "open": round(o, 3), "high": round(h, 3),
                             "low": round(l, 3), "close": round(c, 3), "volume": int(rng.uniform(2e5, 5e6))})
                price = c
            day += dt.timedelta(days=1)
        return [r for r in rows if start.isoformat() <= r["time_key"][:10] <= end.isoformat()]

    def health(self) -> Dict[str, Any]:
        return {"source": "mock", "opend": {"connected": False, "note": "Mock mode: OpenD is not used."}}

    def candles(self, code: str, start: dt.date, end: dt.date) -> Dict[str, Any]:
        out = finalise_bars(self._series(code, start, end))
        out.update({"symbol": f"MOCK.{code}", "source": "mock"})
        return out

    def quote(self, code: str) -> Dict[str, Any]:
        rows = self._series(code, dt.date(2020, 1, 1), dt.date.today())
        last = rows[-1]
        prev = rows[-2] if len(rows) > 1 else last
        return {"symbol": f"MOCK.{code}", "source": "mock", "price": last["close"], "prevClose": prev["close"],
                "open": last["open"], "high": last["high"], "low": last["low"], "volume": last["volume"],
                "time": last["time_key"]}


class MoomooBackend(Backend):
    """Reads from a running OpenD through the official `moomoo` Python SDK (read-only calls only)."""

    name = "moomoo"

    def __init__(self, host: str, port: int, market_prefix: str, sdk: Any = None) -> None:
        if sdk is None:
            try:
                import moomoo as sdk  # type: ignore[no-redef]
            except ImportError:
                raise BridgeError(
                    "sdk-missing",
                    "The Moomoo Python SDK is not installed. Run:  pip install moomoo-api", 500)
        self.sdk = sdk
        self.prefix = market_prefix.upper()
        self.host, self.port = host, port
        self.ctx = sdk.OpenQuoteContext(host=host, port=port)

    # Moomoo reports problems as text; map the common ones to stable codes the app can explain.
    @staticmethod
    def _failure(detail: Any) -> BridgeError:
        text = str(detail)
        low = text.lower()
        if "quota" in low or "frequent" in low or "limit" in low:
            return BridgeError("quota", f"Moomoo refused the request because a quota or rate limit was reached: {text}", 429)
        if "right" in low or "permission" in low or "authority" in low or "no quote" in low:
            return BridgeError("no-quote-right", f"Your Moomoo account has no quote right for this market or security: {text}", 403)
        if "unknown" in low or "not found" in low or "no such" in low:
            return BridgeError("not-found", f"Moomoo does not know this security: {text}", 404)
        if "connect" in low or "opend" in low or "timeout" in low:
            return BridgeError("opend-unreachable", f"Could not reach OpenD. Is it running and logged in? {text}", 503)
        return BridgeError("upstream", f"Moomoo returned an error: {text}", 502)

    def _symbol(self, code: str) -> str:
        return f"{self.prefix}.{code}"

    def health(self) -> Dict[str, Any]:
        info: Dict[str, Any] = {"connected": False}
        try:
            ret, state = self.ctx.get_global_state()
            if ret == self.sdk.RET_OK and isinstance(state, dict):
                info = {"connected": True, "quoteLoggedIn": bool(state.get("qot_logined")),
                        "serverVersion": state.get("server_ver")}
            else:
                info["note"] = str(state)
        except Exception as exc:  # the SDK raises on a dead socket
            info["note"] = str(exc)
        return {"source": "moomoo", "marketPrefix": self.prefix, "opend": info}

    def candles(self, code: str, start: dt.date, end: dt.date) -> Dict[str, Any]:
        symbol = self._symbol(code)
        rows: List[Dict[str, Any]] = []
        key = None
        for _ in range(200):  # hard stop so a bad cursor can never loop forever
            try:
                ret, data, key = self.ctx.request_history_kline(
                    symbol, start=start.isoformat(), end=end.isoformat(),
                    ktype=self.sdk.KLType.K_DAY, autype=self.sdk.AuType.NONE,
                    max_count=1000, page_req_key=key)
            except Exception as exc:
                raise self._failure(exc)
            if ret != self.sdk.RET_OK:
                raise self._failure(data)
            rows.extend(data.to_dict("records"))
            if key is None:
                break
        out = finalise_bars(rows)
        out.update({"symbol": symbol, "source": "moomoo", "adjusted": False})
        return out

    def quote(self, code: str) -> Dict[str, Any]:
        symbol = self._symbol(code)
        try:
            ret, data = self.ctx.get_market_snapshot([symbol])
        except Exception as exc:
            raise self._failure(exc)
        if ret != self.sdk.RET_OK:
            raise self._failure(data)
        records = data.to_dict("records")
        if not records:
            raise BridgeError("not-found", f"Moomoo returned no snapshot for {symbol}.", 404)
        r = records[0]
        price = clean_number(r.get("last_price"))
        if price is None or price <= 0:
            raise BridgeError("upstream", f"Moomoo returned no usable last price for {symbol}.", 502)
        return {"symbol": symbol, "source": "moomoo", "price": price,
                "prevClose": clean_number(r.get("prev_close_price")), "open": clean_number(r.get("open_price")),
                "high": clean_number(r.get("high_price")), "low": clean_number(r.get("low_price")),
                "volume": clean_number(r.get("volume")), "time": str(r.get("update_time") or "")}

    def close(self) -> None:
        try:
            self.ctx.close()
        except Exception:
            pass


# --------------------------------------------------------------------------------------------
# HTTP server
# --------------------------------------------------------------------------------------------

def host_is_loopback(host_header: str) -> bool:
    host = (host_header or "").strip()
    if host.startswith("["):  # [::1]:8765
        host = host[1:].split("]")[0]
    else:
        host = host.rsplit(":", 1)[0] if host.count(":") == 1 else host
    return host in LOOPBACK_HOSTS


def make_handler(backend: Backend, origins: Sequence[str]) -> type:
    allowed = tuple(o.rstrip("/") for o in origins)

    class Handler(BaseHTTPRequestHandler):
        server_version = f"EquityLensMoomooBridge/{VERSION}"

        def log_message(self, fmt: str, *args: Any) -> None:  # keep the console quiet and free of query strings
            if os.environ.get("EQUITYLENS_BRIDGE_VERBOSE"):
                sys.stderr.write("bridge: " + (fmt % args) + "\n")

        # -- plumbing -----------------------------------------------------------------------
        def _origin(self) -> Optional[str]:
            return self.headers.get("Origin")

        def _cors(self) -> None:
            origin = self._origin()
            if origin and origin.rstrip("/") in allowed:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")

        def _send(self, status: int, body: Dict[str, Any]) -> None:
            payload = json.dumps(body).encode("utf-8")
            self.send_response(status)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)

        def _fail(self, err: BridgeError) -> None:
            self._send(err.status, {"error": {"code": err.code, "message": err.message}})

        def _guard(self) -> bool:
            """Returns True when the request may proceed."""
            if not host_is_loopback(self.headers.get("Host", "")):
                self._fail(BridgeError("bad-host", "Requests must address the bridge as localhost or 127.0.0.1.", 403))
                return False
            origin = self._origin()
            if origin and origin.rstrip("/") not in allowed:
                self._fail(BridgeError("origin-not-allowed",
                                       f"This page ({origin}) is not on the bridge's allow-list. Start the bridge with --allow-origin {origin} if you trust it.", 403))
                return False
            return True

        # -- verbs --------------------------------------------------------------------------
        def do_OPTIONS(self) -> None:  # CORS preflight, including Chrome's Private Network Access preflight
            if not self._guard():
                return
            self.send_response(204)
            self._cors()
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "600")
            if self.headers.get("Access-Control-Request-Private-Network", "").lower() == "true":
                self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self) -> None:
            if not self._guard():
                return
            url = urlparse(self.path)
            q = {k: v[0] for k, v in parse_qs(url.query).items()}
            try:
                if url.path == "/health":
                    info = backend.health()
                    info.update({"ok": True, "bridgeVersion": VERSION, "readOnly": True})
                    self._send(200, info)
                elif url.path == "/candles":
                    code = self._code(q)
                    end = parse_date(q["to"], "to") if "to" in q else dt.date.today()
                    start = parse_date(q["from"], "from") if "from" in q else end - dt.timedelta(days=3 * 365)
                    if start > end:
                        raise BridgeError("bad-request", "'from' must not be after 'to'.", 400)
                    if (end - start).days > MAX_SPAN_DAYS:
                        raise BridgeError("bad-request", "Ask for at most 20 years at a time.", 400)
                    self._send(200, backend.candles(code, start, end))
                elif url.path == "/quote":
                    self._send(200, backend.quote(self._code(q)))
                else:
                    raise BridgeError("not-found", "Unknown path. Try /health, /candles or /quote.", 404)
            except BridgeError as err:
                self._fail(err)
            except Exception as exc:  # never leak a stack trace to the page
                self._fail(BridgeError("internal", f"Unexpected bridge error: {type(exc).__name__}", 500))

        @staticmethod
        def _code(q: Dict[str, str]) -> str:
            code = q.get("code", "")
            if not CODE_RE.match(code):
                raise BridgeError("bad-request", "'code' must be the stock code, e.g. 1155.", 400)
            return code

    return Handler


def make_server(backend: Backend, host: str, port: int, origins: Sequence[str]) -> ThreadingHTTPServer:
    if host not in LOOPBACK_HOSTS:
        raise BridgeError("bad-bind", "The bridge only binds to a loopback address (127.0.0.1, localhost or ::1).", 2)
    return ThreadingHTTPServer((host, port), make_handler(backend, origins))


# --------------------------------------------------------------------------------------------
# Command line
# --------------------------------------------------------------------------------------------

def build_backend(args: argparse.Namespace) -> Backend:
    if args.mock:
        return MockBackend()
    return MoomooBackend(args.opend_host, args.opend_port, args.market_prefix)


def cmd_serve(args: argparse.Namespace) -> int:
    backend = build_backend(args)
    origins = list(DEFAULT_ORIGINS) + list(args.allow_origin or [])
    server = make_server(backend, args.host, args.port, origins)
    shown = args.host if ":" not in args.host else f"[{args.host}]"
    print(f"EquityLens Moomoo bridge {VERSION} ({backend.name}, read-only) on http://{shown}:{args.port}")
    if backend.name == "mock":
        print("MOCK MODE: all data is synthetic. Do not use it for decisions.")
    print("Allowed web origins:", ", ".join(origins))
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
        backend.close()
    return 0


def write_csv(path: str, bars: Sequence[Dict[str, Any]]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["Date", "Open", "High", "Low", "Close", "Volume"])
        for b in bars:
            w.writerow([b["t"], b["o"], b["h"], b["l"], b["c"], "" if b["v"] is None else int(b["v"])])


def cmd_export(args: argparse.Namespace) -> int:
    backend = build_backend(args)
    end = parse_date(args.to, "to") if args.to else dt.date.today()
    start = parse_date(args.start, "from") if args.start else end - dt.timedelta(days=3 * 365)
    os.makedirs(args.out_dir, exist_ok=True)
    status = 0
    try:
        for code in args.codes:
            if not CODE_RE.match(code):
                print(f"skip {code}: not a valid stock code", file=sys.stderr)
                status = 1
                continue
            try:
                result = backend.candles(code, start, end)
            except BridgeError as err:
                print(f"{code}: {err.message}", file=sys.stderr)
                status = 1
                continue
            path = os.path.join(args.out_dir, f"{code}_daily.csv")
            write_csv(path, result["bars"])
            print(f"{code}: wrote {len(result['bars'])} bars to {path} (source: {result['source']})")
    finally:
        backend.close()
    return status


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Read-only Moomoo OpenD bridge for EquityLens.")
    sub = p.add_subparsers(dest="command", required=True)

    def common(sp: argparse.ArgumentParser) -> None:
        sp.add_argument("--opend-host", default="127.0.0.1", help="Host where OpenD runs (default 127.0.0.1).")
        sp.add_argument("--opend-port", type=int, default=DEFAULT_OPEND_PORT, help="OpenD port (default 11111).")
        sp.add_argument("--market-prefix", default="MY", help="Moomoo market prefix for Bursa Malaysia (default MY; unverified).")
        sp.add_argument("--mock", action="store_true", help="Serve synthetic data without OpenD (for trying the app).")

    s = sub.add_parser("serve", help="Run the local bridge for the EquityLens web app.")
    common(s)
    s.add_argument("--host", default="127.0.0.1", help="Loopback address to bind (default 127.0.0.1).")
    s.add_argument("--port", type=int, default=DEFAULT_PORT)
    s.add_argument("--allow-origin", action="append", help="Extra web origin allowed to read the bridge (repeatable).")
    s.set_defaults(func=cmd_serve)

    e = sub.add_parser("export", help="Write daily candles to CSV files that EquityLens can import.")
    common(e)
    e.add_argument("codes", nargs="+", help="Bursa stock codes, e.g. 1155 5183")
    e.add_argument("--from", dest="start", help="Start date YYYY-MM-DD (default: 3 years ago).")
    e.add_argument("--to", help="End date YYYY-MM-DD (default: today).")
    e.add_argument("--out-dir", default="moomoo_export")
    e.set_defaults(func=cmd_export)
    return p


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return int(args.func(args))
    except BridgeError as err:
        print(f"error: {err.message}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
