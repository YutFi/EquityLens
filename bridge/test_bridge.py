"""Tests for the Moomoo bridge. Run:  python3 -m unittest discover -s bridge -v

No Moomoo account, network or third-party package is needed: the SDK is replaced by a fake that
mimics the documented shape (return codes, pandas-like frames with to_dict, paging cursor).
"""
import csv
import datetime as dt
import http.client
import json
import os
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import moomoo_bridge as mb  # noqa: E402

ORIGIN = "http://localhost:5173"


class Frame:
    """Minimal stand-in for a pandas DataFrame."""

    def __init__(self, records):
        self.records = records

    def to_dict(self, orient):
        assert orient == "records"
        return list(self.records)


class FakeSdk:
    RET_OK = 0
    RET_ERROR = -1

    class KLType:
        K_DAY = "K_DAY"

    class AuType:
        NONE = "None"

    def __init__(self):
        outer = self
        self.calls = []
        self.kline_error = None
        self.snapshot_records = [{"last_price": 9.87, "prev_close_price": 9.8, "open_price": 9.81,
                                  "high_price": 9.9, "low_price": 9.79, "volume": 1234500,
                                  "update_time": "2026-11-23 10:30:00"}]

        class Ctx:
            def __init__(self, host, port):
                outer.calls.append(("connect", host, port))

            def get_global_state(self):
                return outer.RET_OK, {"qot_logined": True, "server_ver": "10.9"}

            def request_history_kline(self, code, start=None, end=None, ktype=None, autype=None, max_count=1000, page_req_key=None):
                outer.calls.append(("kline", code, start, end, ktype, autype, page_req_key))
                if outer.kline_error:
                    return outer.RET_ERROR, outer.kline_error, None
                if page_req_key is None:
                    page1 = [
                        {"time_key": "2026-11-18 00:00:00", "open": 9.5, "high": 9.7, "low": 9.4, "close": 9.6, "volume": 1000},
                        {"time_key": "2026-11-19 00:00:00", "open": 9.6, "high": 9.8, "low": 9.5, "close": 9.7, "volume": 1100},
                    ]
                    return outer.RET_OK, Frame(page1), "page2"
                page2 = [
                    {"time_key": "2026-11-20 00:00:00", "open": 9.7, "high": 9.9, "low": 9.6, "close": 9.8, "volume": 1200},
                    {"time_key": "2026-11-20 00:00:00", "open": 9.7, "high": 9.95, "low": 9.6, "close": 9.85, "volume": 1250},  # duplicate date
                    {"time_key": "2026-11-21 00:00:00", "open": 9.8, "high": 9.0, "low": 9.9, "close": 9.8, "volume": 1}  # high < low
                ]
                return outer.RET_OK, Frame(page2), None

            def get_market_snapshot(self, codes):
                outer.calls.append(("snapshot", tuple(codes)))
                return outer.RET_OK, Frame(outer.snapshot_records)

            def close(self):
                outer.calls.append(("close",))

        self.OpenQuoteContext = Ctx


class Served:
    def __init__(self, backend, origins=(ORIGIN,)):
        self.server = mb.make_server(backend, "127.0.0.1", 0, origins)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def get(self, path, headers=None, method="GET"):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        conn.request(method, path, headers=headers or {})
        res = conn.getresponse()
        raw = res.read()
        try:
            body = json.loads(raw) if raw else None
        except ValueError:  # e.g. the stdlib's HTML 501 page for a verb with no handler
            body = None
        out = (res.status, dict(res.getheaders()), body)
        conn.close()
        return out

    def stop(self):
        self.server.shutdown()
        self.server.server_close()


class MockServerTests(unittest.TestCase):
    def setUp(self):
        self.s = Served(mb.MockBackend())

    def tearDown(self):
        self.s.stop()

    def test_health_is_read_only_and_labelled_mock(self):
        status, _, body = self.s.get("/health", {"Origin": ORIGIN})
        self.assertEqual(status, 200)
        self.assertTrue(body["readOnly"])
        self.assertEqual(body["source"], "mock")

    def test_candles_are_valid_sorted_and_labelled_mock(self):
        status, headers, body = self.s.get("/candles?code=1155&from=2025-01-01&to=2025-03-31", {"Origin": ORIGIN})
        self.assertEqual(status, 200)
        self.assertEqual(headers["Access-Control-Allow-Origin"], ORIGIN)
        self.assertEqual(body["source"], "mock")
        dates = [b["t"] for b in body["bars"]]
        self.assertEqual(dates, sorted(set(dates)))
        self.assertTrue(all(b["h"] >= b["l"] > 0 for b in body["bars"]))
        self.assertTrue(dates[0] >= "2025-01-01" and dates[-1] <= "2025-03-31")

    def test_mock_is_deterministic(self):
        a = self.s.get("/candles?code=1155&from=2025-01-01&to=2025-02-01")[2]
        b = self.s.get("/candles?code=1155&from=2025-01-01&to=2025-02-01")[2]
        self.assertEqual(a, b)

    def test_quote(self):
        status, _, body = self.s.get("/quote?code=1155")
        self.assertEqual(status, 200)
        self.assertGreater(body["price"], 0)
        self.assertEqual(body["source"], "mock")

    def test_rejects_unlisted_origin(self):
        status, headers, body = self.s.get("/health", {"Origin": "https://evil.example"})
        self.assertEqual(status, 403)
        self.assertEqual(body["error"]["code"], "origin-not-allowed")
        self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_rejects_non_loopback_host_header(self):
        status, _, body = self.s.get("/health", {"Host": "attacker.example:8765"})
        self.assertEqual(status, 403)
        self.assertEqual(body["error"]["code"], "bad-host")

    def test_preflight_includes_private_network_header(self):
        status, headers, _ = self.s.get(
            "/candles?code=1155",
            {"Origin": ORIGIN, "Access-Control-Request-Method": "GET", "Access-Control-Request-Private-Network": "true"},
            method="OPTIONS")
        self.assertEqual(status, 204)
        self.assertEqual(headers["Access-Control-Allow-Private-Network"], "true")
        self.assertEqual(headers["Access-Control-Allow-Origin"], ORIGIN)

    def test_bad_inputs(self):
        for path in ("/candles", "/candles?code=../etc", "/candles?code=1155&from=2025-13-40",
                     "/candles?code=1155&from=2025-02-01&to=2025-01-01", "/candles?code=1155&from=1990-01-01&to=2025-01-01",
                     "/quote?code=a%20b"):
            status, _, body = self.s.get(path)
            self.assertEqual(status, 400, path)
            self.assertEqual(body["error"]["code"], "bad-request")

    def test_unknown_path_and_no_write_routes(self):
        self.assertEqual(self.s.get("/orders")[0], 404)
        self.assertEqual(self.s.get("/candles?code=1155", method="POST")[0], 501)  # no POST handler exists


class MoomooBackendTests(unittest.TestCase):
    def setUp(self):
        self.sdk = FakeSdk()
        self.backend = mb.MoomooBackend("127.0.0.1", 11111, "my", sdk=self.sdk)
        self.s = Served(self.backend)

    def tearDown(self):
        self.s.stop()

    def test_follows_paging_cleans_rows_and_uses_unadjusted_daily(self):
        status, _, body = self.s.get("/candles?code=1155&from=2026-11-01&to=2026-11-23")
        self.assertEqual(status, 200)
        self.assertEqual(body["symbol"], "MY.1155")
        self.assertEqual(body["source"], "moomoo")
        self.assertEqual([b["t"] for b in body["bars"]], ["2026-11-18", "2026-11-19", "2026-11-20"])
        self.assertEqual(body["bars"][2]["c"], 9.85)  # later duplicate wins
        self.assertEqual(body["rejected"], 1)          # the high<low row
        kline_calls = [c for c in self.sdk.calls if c[0] == "kline"]
        self.assertEqual(len(kline_calls), 2)
        self.assertEqual(kline_calls[0][4:6], ("K_DAY", "None"))
        self.assertEqual(kline_calls[1][6], "page2")

    def test_quote_maps_snapshot_fields(self):
        status, _, body = self.s.get("/quote?code=1155")
        self.assertEqual(status, 200)
        self.assertEqual(body["price"], 9.87)
        self.assertEqual(body["prevClose"], 9.8)
        self.assertEqual(body["time"], "2026-11-23 10:30:00")

    def test_quote_without_usable_price_is_an_error_not_a_zero(self):
        self.sdk.snapshot_records = [{"last_price": 0, "update_time": "x"}]
        status, _, body = self.s.get("/quote?code=1155")
        self.assertEqual(status, 502)
        self.assertEqual(body["error"]["code"], "upstream")

    def test_upstream_errors_map_to_stable_codes(self):
        cases = {
            "Historical K-line quota is not enough": (429, "quota"),
            "No quote right for this market": (403, "no-quote-right"),
            "Unknown stock": (404, "not-found"),
            "Connect to OpenD timeout": (503, "opend-unreachable"),
            "something odd": (502, "upstream"),
        }
        for text, (status, code) in cases.items():
            self.sdk.kline_error = text
            got_status, _, body = self.s.get("/candles?code=1155")
            self.assertEqual((got_status, body["error"]["code"]), (status, code), text)

    def test_health_reports_opend_state(self):
        status, _, body = self.s.get("/health")
        self.assertEqual(status, 200)
        self.assertTrue(body["opend"]["connected"])
        self.assertEqual(body["marketPrefix"], "MY")

    def test_missing_sdk_gives_install_hint(self):
        saved = sys.modules.get("moomoo")
        sys.modules["moomoo"] = None  # makes `import moomoo` raise ImportError
        try:
            with self.assertRaises(mb.BridgeError) as ctx:
                mb.MoomooBackend("127.0.0.1", 11111, "MY")
            self.assertEqual(ctx.exception.code, "sdk-missing")
            self.assertIn("pip install moomoo-api", ctx.exception.message)
        finally:
            if saved is None:
                sys.modules.pop("moomoo", None)
            else:
                sys.modules["moomoo"] = saved


class CliTests(unittest.TestCase):
    def test_refuses_non_loopback_bind(self):
        with self.assertRaises(mb.BridgeError):
            mb.make_server(mb.MockBackend(), "0.0.0.0", 0, [])

    def test_export_writes_importable_csv(self):
        with tempfile.TemporaryDirectory() as d:
            code = mb.main(["export", "1155", "--mock", "--from", "2025-01-01", "--to", "2025-01-31", "--out-dir", d])
            self.assertEqual(code, 0)
            with open(os.path.join(d, "1155_daily.csv"), newline="") as fh:
                rows = list(csv.reader(fh))
            self.assertEqual(rows[0], ["Date", "Open", "High", "Low", "Close", "Volume"])
            self.assertGreater(len(rows), 15)
            dt.datetime.strptime(rows[1][0], "%Y-%m-%d")

    def test_export_skips_invalid_code(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(mb.main(["export", "../x", "--mock", "--out-dir", d]), 1)
            self.assertEqual(os.listdir(d), [])

    def test_no_trading_symbols_in_source(self):
        src = open(os.path.join(os.path.dirname(__file__), "moomoo_bridge.py"), encoding="utf-8").read()
        for word in ("place_order", "OpenSecTradeContext", "OpenTradeContext", "unlock_trade", "modify_order"):
            self.assertNotIn(word, src)


if __name__ == "__main__":
    unittest.main()
