"""highlyartmon [serve|mcp|connect|disconnect|render|version]"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

from . import __version__, paths

SKILL = """---
name: highlyartmon
description: Pixel-art and sprite design with the HighlyArtMon studio (ham_* MCP tools). Use when the user asks for sprites, pixel art, tiles, icons, animations, sprite sheets, 2.5D sprite stacks or isometric art, game assets for GameMaker (GML) or other engines, or to clean up generated art.
---

# HighlyArtMon

1. Call `ham_guide` once per session and follow its workflow; it is short.
2. `ham_status` tells you what the user has open: work on that when they say "this sprite".
3. Design the palette as ramps before drawing. Draw the silhouette first with `grid` ops, then light, outline, details.
4. Every `ham_edit` returns an image: look at it critically (readability at 1x, silhouette, light consistency) and iterate. Never declare a sprite done without viewing it and running `ham_lint`.
5. Animations: keyframes first, then in-betweens; check with `ham_view` mode onion and sheet.
6. Export with `ham_export` (GameMaker strips by default) and tell the user the files and origin.
Write `note` fields in the user's language; they watch the editor live.
"""


def connect(desktop: bool = True) -> int:
    py = sys.executable
    ok = False
    claude = shutil.which("claude")
    if claude:
        subprocess.run([claude, "mcp", "remove", "--scope", "user", "highlyartmon"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        r = subprocess.run([claude, "mcp", "add", "--scope", "user", "highlyartmon", "--", py, "-m", "highlyartmon", "mcp"])
        ok = r.returncode == 0
        print("-> Claude Code: connected (all projects)" if ok else "-> Claude Code: `claude mcp add` failed")
    else:
        print("-> Claude Code CLI not found; skipping (install it, then run `highlyartmon connect`)")
    sk = Path.home() / ".claude" / "skills" / "highlyartmon"
    sk.mkdir(parents=True, exist_ok=True)
    (sk / "SKILL.md").write_text(SKILL, encoding="utf-8")
    print(f"-> Skill installed: {sk / 'SKILL.md'}")
    if desktop:
        base = Path(os.environ.get("APPDATA", "")) / "Claude" if sys.platform == "win32" else (
            Path.home() / "Library/Application Support/Claude" if sys.platform == "darwin" else Path.home() / ".config/Claude")
        if base.is_dir():
            cfg = base / "claude_desktop_config.json"
            data = paths.read_json(cfg, {}) if cfg.exists() else {}
            if cfg.exists() and not data:
                print(f"-> Claude Desktop: {cfg} is not valid JSON; add this server by hand: {py} -m highlyartmon mcp")
            else:
                data.setdefault("mcpServers", {})["highlyartmon"] = {"command": py, "args": ["-m", "highlyartmon", "mcp"]}
                if cfg.exists():
                    shutil.copy(cfg, str(cfg) + ".bak")
                cfg.write_text(json.dumps(data, indent=2), encoding="utf-8")
                print("-> Claude Desktop: connected (restart Claude Desktop to load it)")
                ok = True
    if not ok:
        print(json.dumps({"mcpServers": {"highlyartmon": {"command": py, "args": ["-m", "highlyartmon", "mcp"]}}}, indent=2))
        print("-> Paste the block above into your MCP client's config.")
    return 0


def disconnect() -> int:
    claude = shutil.which("claude")
    if claude:
        subprocess.run([claude, "mcp", "remove", "--scope", "user", "highlyartmon"])
    shutil.rmtree(Path.home() / ".claude" / "skills" / "highlyartmon", ignore_errors=True)
    print("-> Disconnected from Claude Code (Claude Desktop config left untouched)")
    return 0


def running_url():
    info = paths.read_json(paths.running_file(), {})
    if info.get("port"):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{info['port']}/api/ping", timeout=1.5) as r:
                if json.loads(r.read()).get("app") == "highlyartmon":
                    return f"http://127.0.0.1:{info['port']}/"
        except (OSError, ValueError):
            pass
    return None


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="highlyartmon", description="HighlyArtMon - pixel-art studio for you and Claude")
    sub = ap.add_subparsers(dest="cmd")
    s = sub.add_parser("serve", help="run the local app server")
    s.add_argument("--port", type=int, default=int(os.environ.get("HIGHLYARTMON_PORT", 7717)))
    s.add_argument("--window", action="store_true", help="open the editor window")
    sub.add_parser("mcp", help="MCP stdio bridge (used by Claude)")
    c = sub.add_parser("connect", help="connect to Claude Code (+ Claude Desktop) and install the skill")
    c.add_argument("--no-desktop", action="store_true")
    sub.add_parser("disconnect")
    r = sub.add_parser("render", help="render a sprite to PNG")
    r.add_argument("name")
    r.add_argument("--mode", default="review")
    r.add_argument("-o", "--out")
    sub.add_parser("version")
    ap.add_argument("--no-window", action="store_true")
    a = ap.parse_args(argv)

    if a.cmd == "mcp":
        from .mcp import main as m
        m()
        return 0
    if a.cmd == "connect":
        return connect(not a.no_desktop)
    if a.cmd == "disconnect":
        return disconnect()
    if a.cmd == "version":
        print(__version__)
        return 0
    if a.cmd == "render":
        from .model import Sprite
        from .raster import view
        p = paths.projects_dir() / f"{a.name}.ham.json"
        img, cap = view(Sprite.from_dict(paths.read_json(p, {})), a.mode)
        out = a.out or f"{a.name}_{a.mode}.png"
        Path(out).write_bytes(img.png())
        print(f"{out}: {cap}")
        return 0
    from .server import open_app_window, serve
    if a.cmd == "serve":
        serve(a.port, open_window=a.window)
        return 0
    url = running_url()
    if url:
        if not a.no_window:
            open_app_window(url)
        print(f"HighlyArtMon already running at {url}")
        return 0
    serve(int(os.environ.get("HIGHLYARTMON_PORT", 7717)), open_window=not a.no_window)
    return 0


if __name__ == "__main__":
    sys.exit(main())
