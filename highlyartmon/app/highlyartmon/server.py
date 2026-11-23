"""Local HighlyArtMon server: serves the editor, stores projects, streams live changes (SSE), backs the MCP bridge."""
from __future__ import annotations

import base64
import json
import os
import queue
import secrets
import shutil
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from . import __version__, paths
from .export import default_export_dir, export
from .lint import lint, summary
from .model import OPS, Sprite, check_name, presets, resolve_palette
from .raster import decode_png, quantize, view

UI_DIR = Path(__file__).parent / "ui"
GUIDE = Path(__file__).parent / "guide.md"
TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
         ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json"}


class Store:
    def __init__(self, root: Path):
        self.root = root
        self.lock = threading.RLock()
        self.cache: dict = {}
        self.subs: list = []
        self.ui_state: dict = {}
        self.activity: list = []

    # ---- events
    def subscribe(self):
        q = queue.Queue(maxsize=200)
        with self.lock:
            self.subs.append(q)
        return q

    def unsubscribe(self, q):
        with self.lock:
            if q in self.subs:
                self.subs.remove(q)

    def emit(self, ev: dict):
        with self.lock:
            for q in list(self.subs):
                try:
                    q.put_nowait(ev)
                except queue.Full:
                    pass

    def note(self, text, by="claude", name=None):
        item = {"t": time.time(), "text": str(text)[:300], "by": by, "name": name}
        with self.lock:
            self.activity = (self.activity + [item])[-50:]
        self.emit({"type": "activity", **item})

    # ---- docs
    def path(self, name) -> Path:
        return self.root / f"{check_name(name)}.ham.json"

    def list(self):
        out = []
        with self.lock:
            files = sorted(self.root.glob("*.ham.json"), key=lambda p: -p.stat().st_mtime)
        for p in files:
            name = p.name[:-9]
            with self.lock:
                d = self.cache[name].d if name in self.cache else paths.read_json(p, {})
            if d.get("app") == "highlyartmon":
                out.append({"name": d["name"], "size": [d["width"], d["height"]], "frames": len(d["frames"]),
                            "layers": len(d["layers"]), "colors": len(d["palette"]) - 1, "mode": d["meta"].get("mode"),
                            "updated": d.get("updated")})
        return out

    def get(self, name) -> Sprite:
        with self.lock:
            if name not in self.cache:
                p = self.path(name)
                if not p.exists():
                    names = [x["name"] for x in self.list()][:20]
                    raise KeyError(f"no sprite named {name!r}. Existing: {', '.join(names) or '(none)'}; create it with ham_new")
                self.cache[name] = Sprite.from_dict(paths.read_json(p, {}))
            return self.cache[name]

    def save(self, s: Sprite, by="claude"):
        with self.lock:
            name = s.d["name"]
            self.cache[name] = s
            paths.write_json(self.path(name), s.to_dict())
        self.emit({"type": "doc", "name": name, "version": s.d["version"], "by": by})

    def delete(self, name):
        with self.lock:
            p = self.path(name)
            if p.exists():
                trash = self.root / ".trash"
                trash.mkdir(exist_ok=True)
                shutil.move(str(p), str(trash / f"{name}.{int(time.time())}.ham.json"))
            self.cache.pop(name, None)
        self.emit({"type": "deleted", "name": name})


def png_b64(img) -> str:
    return base64.b64encode(img.png()).decode()


def actions(store: Store):
    def status(a):
        return {"app": "highlyartmon", "version": __version__, "projects_dir": str(store.root), "projects": store.list()[:30],
                "ui": store.ui_state, "viewers": len(store.subs), "ops": OPS}

    def new(a):
        name = check_name(a["name"])
        if store.path(name).exists() and not a.get("overwrite"):
            raise ValueError(f"{name} already exists; pick another name or pass overwrite: true")
        s = Sprite.new(name, a.get("width", 32), a.get("height", 32), a.get("palette"), a.get("frames", 1),
                       a.get("layers"), a.get("mode", "2d"), a.get("bg", "#2b2f3a"), a.get("origin"))
        store.save(s)
        store.note(f"nuevo sprite {name} {s.w}x{s.h}", name=name)
        store.emit({"type": "focus", "name": name})
        return {"name": name, "doc": describe(s)}

    def describe(s: Sprite):
        return {"name": s.d["name"], "size": [s.w, s.h], "version": s.d["version"], "origin": s.d["origin"], "meta": s.d["meta"],
                "palette": {i: c for i, c in enumerate(s.palette) if c}, "layers": [f"{i}:{L['name']}{'' if L.get('visible', True) else ' (hidden)'}" for i, L in enumerate(s.layers)],
                "frames": [f"{i}:{f['duration']}ms" for i, f in enumerate(s.frames)], "tags": s.d["tags"]}

    def read(a):
        s = store.get(a["name"])
        reg = a.get("region")
        grid = s.to_grid(a.get("layer"), a.get("frame"), tuple(reg) if reg else None, composite=bool(a.get("composite", False)))
        return {"doc": describe(s), "grid": grid, "legend": "'.' = transparent, 1-9 a-z A-Z = palette index (1..61)"}

    def edit(a):
        s = store.get(a["name"])
        log = s.apply(a["ops"])
        store.save(s)
        store.note(a.get("note") or f"{len(log)} cambios: {', '.join(log[:4])}", name=s.d["name"])
        out = {"version": s.d["version"], "log": log}
        if a.get("render", True):
            img, cap = view(s, a.get("view", "review"), a.get("frame"), a.get("scale"))
            out.update({"png": png_b64(img), "caption": cap})
        return out

    def view_(a):
        s = store.get(a["name"])
        img, cap = view(s, a.get("mode", "review"), a.get("frame"), a.get("scale"), a.get("angle"))
        return {"png": png_b64(img), "caption": cap, "size": [img.w, img.h]}

    def lint_(a):
        s = store.get(a["name"])
        res = lint(s)
        res["text"] = summary(res)
        return res

    def export_(a):
        s = store.get(a["name"])
        res = export(s, a.get("dir") or default_export_dir(s.d["name"]), a.get("format", "gamemaker"), a.get("scale", 1), a.get("per_tag", True))
        store.note(f"exportado {s.d['name']} -> {res['dir']}", name=s.d["name"])
        return res

    def import_png(a):
        name = check_name(a["name"])
        if store.path(name).exists() and not a.get("overwrite"):
            raise ValueError(f"{name} already exists; pass overwrite: true")
        img = decode_png(Path(a["path"]).expanduser().read_bytes())
        k = int(a.get("pixel_size") or detect_pixel_size(img))
        if k > 1:  # downsample upscaled pixel art by sampling block centres
            from .raster import Image
            small = Image(img.w // k, img.h // k)
            for y in range(small.h):
                for x in range(small.w):
                    i = ((y * k + k // 2) * img.w + x * k + k // 2) * 4
                    small.px[(y * small.w + x) * 4:(y * small.w + x) * 4 + 4] = img.px[i:i + 4]
            img = small
        pal = resolve_palette(a["palette"]) if a.get("palette") else None
        palette, idx = quantize(img, int(a.get("max_colors", 32)), pal)
        s = Sprite.new(name, img.w, img.h, palette[1:])
        s.cel(0, 0)[:] = idx
        s.d["version"] = 1
        store.save(s)
        store.note(f"importado {Path(a['path']).name} como {name} ({img.w}x{img.h}, {len(palette) - 1} colores, pixel {k})", name=name)
        store.emit({"type": "focus", "name": name})
        return {"name": name, "size": [img.w, img.h], "pixel_size": k, "colors": len(palette) - 1}

    def focus(a):
        store.get(a["name"])
        store.emit({"type": "focus", "name": a["name"], "frame": a.get("frame")})
        return {"ok": True}

    def guide(a):
        return {"text": GUIDE.read_text(encoding="utf-8")}

    def palettes(a):
        return {"presets": presets()}

    def say(a):
        store.note(a["text"], name=a.get("name"))
        return {"ok": True}

    return {"status": status, "list": lambda a: {"projects": store.list()}, "new": new, "read": read, "edit": edit,
            "view": view_, "lint": lint_, "export": export_, "import_png": import_png, "focus": focus, "guide": guide,
            "palettes": palettes, "say": say}


def detect_pixel_size(img) -> int:
    """Smallest run length of identical colors across rows/cols ~ the art's pixel size (1 if not upscaled)."""
    from math import gcd
    g = 0
    for y in range(0, img.h, max(1, img.h // 24)):
        run, prev = 0, None
        for x in range(img.w):
            c = bytes(img.px[(y * img.w + x) * 4:(y * img.w + x) * 4 + 4])
            if c == prev:
                run += 1
            else:
                if prev is not None:
                    g = gcd(g, run)
                run, prev = 1, c
        g = gcd(g, run)
        if g == 1:
            return 1
    return max(1, g) if g <= 64 and img.w % max(1, g) == 0 else 1


def make_handler(store: Store, token: str, port_ref: list):
    acts = actions(store)

    class H(BaseHTTPRequestHandler):
        server_version = "HighlyArtMon/" + __version__

        def log_message(self, *a):
            pass

        def _host_ok(self):
            host = (self.headers.get("Host") or "").split(":")[0]
            return host in ("127.0.0.1", "localhost", "[::1]")

        def _send(self, code, body, ctype="application/json", extra=None):
            data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(data)

        def _authed(self, q=None):
            t = self.headers.get("X-HAM-Token") or (q or {}).get("token", [""])[0]
            return secrets.compare_digest(t or "", token)

        def _body(self):
            n = int(self.headers.get("Content-Length") or 0)
            if n > 64 * 1024 * 1024:
                raise ValueError("request too large")
            return json.loads(self.rfile.read(n) or b"{}")

        def do_GET(self):
            if not self._host_ok():
                return self._send(403, {"error": "bad host"})
            u = urlparse(self.path)
            q = parse_qs(u.query)
            p = u.path
            if p == "/api/ping":
                return self._send(200, {"app": "highlyartmon", "version": __version__})
            if p in ("/", "/index.html"):
                html = (UI_DIR / "index.html").read_text(encoding="utf-8").replace("__HAM_TOKEN__", token)
                return self._send(200, html.encode(), TYPES[".html"])
            if p.startswith("/ui/") or p in ("/app.js", "/style.css", "/palettes.json", "/icon.svg", "/manifest.webmanifest"):
                f = (UI_DIR / p.split("/")[-1]).resolve()
                if f.parent != UI_DIR.resolve() or not f.exists():
                    return self._send(404, {"error": "not found"})
                return self._send(200, f.read_bytes(), TYPES.get(f.suffix, "application/octet-stream"))
            if not self._authed(q):
                return self._send(401, {"error": "token required"})
            if p == "/api/events":
                return self._sse()
            if p == "/api/projects":
                return self._send(200, {"projects": store.list(), "activity": store.activity[-20:]})
            if p.startswith("/api/doc/"):
                try:
                    return self._send(200, store.get(unquote(p[9:])).to_dict())
                except (KeyError, ValueError) as e:
                    return self._send(404, {"error": str(e)})
            if p.startswith("/api/render/"):
                try:
                    s = store.get(unquote(p[12:]).removesuffix(".png"))
                    img, _ = view(s, q.get("mode", ["review"])[0], q.get("frame", [None])[0], q.get("scale", [None])[0])
                    return self._send(200, img.png(), "image/png")
                except (KeyError, ValueError) as e:
                    return self._send(404, {"error": str(e)})
            return self._send(404, {"error": "not found"})

        def _sse(self):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            sub = store.subscribe()
            try:
                self.wfile.write(b"data: " + json.dumps({"type": "hello", "version": __version__}).encode() + b"\n\n")
                self.wfile.flush()
                while True:
                    try:
                        ev = sub.get(timeout=15)
                        self.wfile.write(b"data: " + json.dumps(ev, ensure_ascii=False).encode() + b"\n\n")
                    except queue.Empty:
                        self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
            except OSError:
                pass
            finally:
                store.unsubscribe(sub)

        def do_PUT(self):
            if not self._host_ok() or not self._authed():
                return self._send(401, {"error": "token required"})
            p = urlparse(self.path).path
            if not p.startswith("/api/doc/"):
                return self._send(404, {"error": "not found"})
            try:
                body = self._body()
                name = check_name(unquote(p[9:]))
                s = Sprite.from_dict(body["doc"])
                s.d["name"] = name
                with store.lock:
                    cur = store.cache.get(name) or (store.get(name) if store.path(name).exists() else None)
                    if cur and body.get("base_version") is not None and int(body["base_version"]) < cur.d["version"]:
                        return self._send(409, {"error": "conflict", "doc": cur.to_dict()})
                    s.d["version"] = (cur.d["version"] if cur else 0) + 1
                    s.d["updated"] = time.time()
                    store.save(s, by=body.get("by", "you"))
                return self._send(200, {"version": s.d["version"]})
            except (KeyError, ValueError, TypeError) as e:
                return self._send(400, {"error": str(e)})

        def do_DELETE(self):
            if not self._host_ok() or not self._authed():
                return self._send(401, {"error": "token required"})
            p = urlparse(self.path).path
            if p.startswith("/api/doc/"):
                try:
                    store.delete(unquote(p[9:]))
                    return self._send(200, {"ok": True})
                except ValueError as e:
                    return self._send(400, {"error": str(e)})
            return self._send(404, {"error": "not found"})

        def do_POST(self):
            if not self._host_ok() or not self._authed():
                return self._send(401, {"error": "token required"})
            p = urlparse(self.path).path
            try:
                body = self._body()
                if p == "/api/ui-state":
                    store.ui_state = {k: body.get(k) for k in ("doc", "frame", "layer", "tool", "color")}
                    return self._send(200, {"ok": True})
                if p.startswith("/api/claude/") or p.startswith("/api/act/"):
                    name = p.rsplit("/", 1)[-1]
                    if name not in acts:
                        return self._send(404, {"error": f"unknown action {name}"})
                    res = acts[name](body)
                    return self._send(200, res)
            except KeyError as e:
                return self._send(400, {"error": str(e).strip('"') if "no sprite" in str(e) else f"missing field {e}"})
            except (ValueError, TypeError, OSError) as e:
                return self._send(400, {"error": str(e)})
            return self._send(404, {"error": "not found"})

    return H


def serve(port: int = 7717, open_window: bool = True, quiet: bool = False):
    store = Store(paths.projects_dir())
    token = secrets.token_urlsafe(24)
    httpd = None
    for p in range(port, port + 20):
        try:
            httpd = ThreadingHTTPServer(("127.0.0.1", p), make_handler(store, token, [p]))
            break
        except OSError:
            continue
    if httpd is None:
        raise SystemExit(f"no free port in {port}..{port + 19}")
    httpd.daemon_threads = True
    real = httpd.server_address[1]
    paths.write_json(paths.running_file(), {"port": real, "token": token, "pid": os.getpid(), "version": __version__})
    url = f"http://127.0.0.1:{real}/"
    if not quiet:
        print(f"HighlyArtMon {__version__} -> {url}  (projects: {store.root})", flush=True)
    if open_window:
        threading.Timer(0.4, open_app_window, args=(url,)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        cur = paths.read_json(paths.running_file(), {})
        if cur.get("pid") == os.getpid():
            try:
                paths.running_file().unlink()
            except OSError:
                pass


def open_app_window(url: str):
    """Open as an app-style window (Edge/Chrome --app) when possible, else the default browser."""
    import subprocess
    import sys
    import webbrowser
    cands = []
    if sys.platform == "win32":
        for base in (os.environ.get("ProgramFiles(x86)", ""), os.environ.get("ProgramFiles", ""), os.environ.get("LOCALAPPDATA", "")):
            cands += [os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"),
                      os.path.join(base, "Google", "Chrome", "Application", "chrome.exe")]
    elif sys.platform == "darwin":
        cands += ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]
    else:
        cands += [shutil.which(n) or "" for n in ("google-chrome", "chromium", "chromium-browser", "microsoft-edge")]
    for c in cands:
        if c and os.path.exists(c):
            try:
                subprocess.Popen([c, f"--app={url}", "--window-size=1500,920"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                return
            except OSError:
                pass
    webbrowser.open(url)
