import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from highlyartmon.export import export  # noqa: E402
from highlyartmon.lint import lint  # noqa: E402
from highlyartmon.model import Sprite  # noqa: E402
from highlyartmon.raster import decode_png, view  # noqa: E402

SLIME = [
    "................",
    "......1111......",
    "....11222211....",
    "...1223333221...",
    "..122333333221..",
    "..123344333321..",
    ".12334433333321.",
    ".12333333333221.",
    ".12233333332221.",
    "..122222222221..",
    "...1111111111...",
]


class ModelTests(unittest.TestCase):
    def make(self):
        s = Sprite.new("spr_slime", 16, 16, ["#1b1020", "#2f5a6a", "#3f8a7a", "#7cc07a"], frames=1)
        s.apply([{"op": "grid", "rows": SLIME, "y": 4}])
        return s

    def test_grid_roundtrip_and_atomic(self):
        s = self.make()
        self.assertEqual(s.to_grid().split("\n")[5], SLIME[1])
        v = s.d["version"]
        with self.assertRaises(ValueError):
            s.apply([{"op": "rect", "x": 0, "y": 0, "w": 2, "h": 2, "c": 2}, {"op": "nope"}])
        self.assertEqual(s.d["version"], v)
        self.assertEqual(s.to_grid().split("\n")[0], "." * 16)  # rect rolled back

    def test_shapes_and_structure(self):
        s = self.make()
        log = s.apply([
            {"op": "add_layer", "name": "fx"},
            {"op": "ellipse", "x": 0, "y": 0, "w": 5, "h": 5, "c": 4, "layer": "fx"},
            {"op": "add_frame", "copy_from": 0},
            {"op": "shift", "dy": -1, "frame": 1, "layer": 0},
            {"op": "tag", "name": "idle", "from": 0, "to": 1},
            {"op": "outline", "c": 1, "layer": "fx"},
            {"op": "light", "ramp": [2, 3, 4], "layer": 0},
            {"op": "palette", "add": ["#ffffff"]},
        ])
        self.assertEqual(len(log), 8)
        self.assertEqual(len(s.frames), 2)
        d = Sprite.from_dict(json.loads(json.dumps(s.to_dict())))
        self.assertEqual(d.to_grid(0, 1), s.to_grid(0, 1))
        self.assertEqual(len(d.palette), 6)

    def test_views_and_png(self):
        s = self.make()
        s.apply([{"op": "add_frame", "copy_from": 0}, {"op": "add_layer", "name": "top"}])
        for mode in ("review", "frame", "sheet", "onion", "silhouette", "stack", "tile", "actual"):
            img, cap = view(s, mode)
            back = decode_png(img.png())
            self.assertEqual((back.w, back.h), (img.w, img.h), mode)
            self.assertTrue(cap)

    def test_lint_finds_problems(self):
        s = Sprite.new("t", 12, 12, ["#101010", "#808080", "#ffffff"])
        s.apply([{"op": "rect", "x": 2, "y": 2, "w": 8, "h": 8, "c": 2, "fill": True},
                 {"op": "pixels", "points": [[5, 5, 3]]},
                 {"op": "rect", "x": 1, "y": 1, "w": 10, "h": 10, "c": 1},
                 {"op": "rect", "x": 2, "y": 2, "w": 2, "h": 2, "c": 1, "fill": True}])
        codes = {i["code"] for i in lint(s)["issues"]}
        self.assertIn("orphan", codes)
        self.assertIn("double_outline", codes)

    def test_export_gamemaker(self):
        s = self.make()
        s.apply([{"op": "add_frame", "copy_from": 0}, {"op": "tag", "name": "idle", "from": 0, "to": 1}])
        with tempfile.TemporaryDirectory() as d:
            res = export(s, d, "gamemaker", scale=2)
            self.assertIn("spr_slime_idle_strip2.png", res["files"])
            img = decode_png((Path(d) / "spr_slime_idle_strip2.png").read_bytes())
            self.assertEqual((img.w, img.h), (64, 32))
            self.assertIn("sprite_add", (Path(d) / "spr_slime_load.gml").read_text())
            export(s, d, "sheet")
            self.assertTrue((Path(d) / "spr_slime_sheet.json").exists())


class ServerMcpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.env = {**os.environ, "HIGHLYARTMON_HOME": cls.tmp.name, "HIGHLYARTMON_PORT": "7790", "PYTHONPATH": str(ROOT),
                   "HIGHLYARTMON_NO_WINDOW": "1"}
        cls.srv = subprocess.Popen([sys.executable, "-m", "highlyartmon", "serve", "--port", "7790"], env=cls.env,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        run = Path(cls.tmp.name) / ".highlyartmon" / "running.json"
        for _ in range(60):
            if run.exists():
                break
            time.sleep(0.1)
        cls.info = json.loads(run.read_text())

    @classmethod
    def tearDownClass(cls):
        cls.srv.terminate()
        cls.srv.wait(5)
        cls.tmp.cleanup()

    def test_http_requires_token(self):
        port = self.info["port"]
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/ping") as r:
            self.assertEqual(json.loads(r.read())["app"], "highlyartmon")
        req = urllib.request.Request(f"http://127.0.0.1:{port}/api/claude/status", data=b"{}", method="POST")
        with self.assertRaises(urllib.error.HTTPError) as e:
            urllib.request.urlopen(req)
        self.assertEqual(e.exception.code, 401)

    def test_mcp_session(self):
        p = subprocess.Popen([sys.executable, "-m", "highlyartmon", "mcp"], env=self.env, stdin=subprocess.PIPE,
                             stdout=subprocess.PIPE, text=True, encoding="utf-8")
        msgs = [
            {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}},
            {"jsonrpc": "2.0", "method": "notifications/initialized"},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
            {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "ham_new", "arguments": {"name": "spr_test", "width": 16, "height": 16, "palette": "pico8"}}},
            {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "ham_edit", "arguments": {"name": "spr_test", "ops": [{"op": "grid", "rows": SLIME, "y": 3}], "note": "prueba"}}},
            {"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "ham_lint", "arguments": {"name": "spr_test"}}},
            {"jsonrpc": "2.0", "id": 6, "method": "tools/call", "params": {"name": "ham_edit", "arguments": {"name": "spr_test", "ops": [{"op": "bogus"}]}}},
        ]
        out, _ = p.communicate("\n".join(json.dumps(m) for m in msgs) + "\n", timeout=60)
        res = {r["id"]: r for r in map(json.loads, out.strip().split("\n"))}
        self.assertEqual(res[1]["result"]["serverInfo"]["name"], "highlyartmon")
        self.assertGreaterEqual(len(res[2]["result"]["tools"]), 10)
        self.assertNotIn("isError", res[3]["result"])
        kinds = [c["type"] for c in res[4]["result"]["content"]]
        self.assertEqual(kinds, ["text", "image"])
        self.assertIn("Lint score", res[5]["result"]["content"][0]["text"])
        self.assertTrue(res[6]["result"]["isError"])


if __name__ == "__main__":
    unittest.main()
