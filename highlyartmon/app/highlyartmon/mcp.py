"""MCP bridge (stdio, JSON-RPC 2.0, one message per line) between Claude and the running HighlyArtMon app.

The bridge finds the local app through ~/.highlyartmon/running.json (port + per-run token, readable only by this user)
and starts it if it is closed. Renders come back to Claude as images, so it sees what it draws.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

from . import __version__, paths
from .model import OPS

PROTOCOLS = ("2025-06-18", "2025-03-26", "2024-11-05")

OP_DOC = (
    "Ops (all accept optional layer and frame: index or name; colors c are palette indices, 0 = transparent; symmetry 'x'|'y'|'xy' mirrors while drawing): "
    "grid{rows:[strings], x,y, mode:'replace'|'over', legend:{char:index}} - chars 1-9a-zA-Z = index 1..61, '.' transparent (best way to draw shapes); "
    "pixels{points:[[x,y,c]...] or points:[[x,y]] + c}; line{x0,y0,x1,y1,c}; polyline{points,c,closed}; rect{x,y,w,h,c,fill}; ellipse{x,y,w,h,c,fill}; "
    "fill{x,y,c,diagonal}; clear{c?}; replace{from,to,all_cels}; outline{c, mode:'outer'|'inner', diagonal}; "
    "light{ramp:[dark..light indices], dir:[-1,-1]} auto-shades toward a light; ramp_shift{ramp, amount, x,y,w,h | points}; "
    "dither{x,y,w,h,c,pattern:'checker'|'25'|'75'|'lines', only}; cleanup{} removes orphan pixels; flip{axis}; mirror{axis, side}; shift{dx,dy,wrap}; "
    "copy{from_layer,from_frame,mode}; add_frame{after, copy_from, duration}; delete_frame{frame}; move_frame{frame,to}; frame_duration{ms, frame?}; "
    "add_layer{name, above}; delete_layer{layer}; layer{layer, name, visible, opacity, move_to}; merge_down{layer}; "
    "palette{preset | colors:[hex], set:{index:hex}, add:[hex]}; resize{w,h,anchor}; origin{x,y}; tag{name,from,to}; meta{mode,bg,notes}."
)

TOOLS = [
    {"name": "ham_guide", "description": "Read FIRST in a session: HighlyArtMon's pixel-art craft guide (silhouette-first workflow, color ramps with hue shift, light, outlines, anti-aliasing, animation timing, 2.5D sprite stacking, isometric, GameMaker export) and the exact loop to follow. Short and practical.",
     "inputSchema": {"type": "object", "properties": {}}},
    {"name": "ham_status", "description": "Is the app running; list of sprites; what the user has open in the editor right now (doc, frame, layer, color) so you can work on what they are looking at.",
     "inputSchema": {"type": "object", "properties": {}}},
    {"name": "ham_new", "description": "Create a sprite and open it live in the user's editor. Palette: preset name (pico8, sweetie16, endesga32, gameboy, grayscale8, warm-ramps) or a list of hex colors you design (best: 3-5 color ramps per material, hue-shifted). Palette index 0 is always transparent; your colors start at 1. mode: 2d | iso | stack (2.5D sprite stacking, one layer per slice, bottom first).",
     "inputSchema": {"type": "object", "properties": {
         "name": {"type": "string", "description": "e.g. spr_player_idle (letters, digits, _ -)"},
         "width": {"type": "integer"}, "height": {"type": "integer"},
         "palette": {"description": "preset name or array of #rrggbb", "anyOf": [{"type": "string"}, {"type": "array", "items": {"type": "string"}}]},
         "frames": {"type": "integer"}, "layers": {"type": "array", "items": {"type": "string"}, "description": "layer names, bottom first"},
         "mode": {"type": "string", "enum": ["2d", "iso", "stack"]}, "bg": {"type": "string", "description": "game background color to judge contrast"},
         "origin": {"type": "array", "items": {"type": "integer"}, "description": "pivot [x,y]; default bottom-center"},
         "overwrite": {"type": "boolean"}}, "required": ["name"]}},
    {"name": "ham_read", "description": "Read a sprite as a text grid ('.' = transparent, 1-9a-zA-Z = palette index) plus palette, layers, frames, tags. Use it to see the user's own edits exactly. region [x0,y0,x1,y1] limits the area; composite true merges visible layers.",
     "inputSchema": {"type": "object", "properties": {"name": {"type": "string"}, "frame": {}, "layer": {}, "composite": {"type": "boolean"},
                                                       "region": {"type": "array", "items": {"type": "integer"}}}, "required": ["name"]}},
    {"name": "ham_edit", "description": "Apply a batch of drawing/structure ops atomically (all or nothing), save, push them live to the user's editor and return a render image so you SEE the result. " + OP_DOC,
     "inputSchema": {"type": "object", "properties": {"name": {"type": "string"}, "ops": {"type": "array", "items": {"type": "object"}},
                                                       "note": {"type": "string", "description": "what you are doing, shown live to the user (their language)"},
                                                       "render": {"type": "boolean", "description": "default true"},
                                                       "view": {"type": "string", "enum": ["review", "frame", "sheet", "onion", "silhouette", "stack", "tile"]},
                                                       "frame": {}, "scale": {"type": "integer"}}, "required": ["name", "ops"]}},
    {"name": "ham_view", "description": "Look at a sprite as an image. modes: review (zoomed on transparency + on game bg + silhouette + real 1x/2x size + all frames), frame, sheet (all frames), onion (prev red / next blue), silhouette, stack (2.5D sprite-stack from 8 angles, or one angle), tile (3x3 repeat to check seams), actual (1x).",
     "inputSchema": {"type": "object", "properties": {"name": {"type": "string"}, "mode": {"type": "string"}, "frame": {}, "scale": {"type": "integer"}, "angle": {"type": "number"}}, "required": ["name"]}},
    {"name": "ham_lint", "description": "Automatic pixel-art review: orphan pixels, 2px outlines, jaggies, frames drifting (feet/center), flat value range, near-duplicate colors, too many colors, outline-vs-background contrast. Returns score/100 with coordinates. Fix warnings before export.",
     "inputSchema": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}},
    {"name": "ham_export", "description": "Export for games. format gamemaker (default: <spr>_strip<N>.png per animation tag, which GameMaker auto-slices on import, plus a .gml with sprite_add and origin), frames (one PNG per frame), sheet (PNG + Aseprite-style JSON), layers (one strip per layer). dir defaults to ~/HighlyArtMon/exports/<name>; pass the user's GameMaker project folder if they want it there.",
     "inputSchema": {"type": "object", "properties": {"name": {"type": "string"}, "format": {"type": "string", "enum": ["gamemaker", "frames", "sheet", "layers"]},
                                                       "dir": {"type": "string"}, "scale": {"type": "integer"}, "per_tag": {"type": "boolean"}}, "required": ["name"]}},
    {"name": "ham_import_png", "description": "Import a PNG (e.g. AI-generated art or a reference) as an editable indexed sprite: detects upscaled pixel size, reduces to max_colors or maps to a palette preset. Then clean it up with ham_edit.",
     "inputSchema": {"type": "object", "properties": {"path": {"type": "string"}, "name": {"type": "string"}, "max_colors": {"type": "integer"},
                                                       "palette": {"type": "string"}, "pixel_size": {"type": "integer"}, "overwrite": {"type": "boolean"}}, "required": ["path", "name"]}},
    {"name": "ham_focus", "description": "Make the user's editor switch to a sprite (and frame) so they watch it.",
     "inputSchema": {"type": "object", "properties": {"name": {"type": "string"}, "frame": {"type": "integer"}}, "required": ["name"]}},
    {"name": "ham_say", "description": "Show a short message in the editor's live Claude feed (e.g. what you will do next, or a question about the design).",
     "inputSchema": {"type": "object", "properties": {"text": {"type": "string"}, "name": {"type": "string"}}, "required": ["text"]}},
]
ACTION = {"ham_guide": "guide", "ham_status": "status", "ham_new": "new", "ham_read": "read", "ham_edit": "edit", "ham_view": "view",
          "ham_lint": "lint", "ham_export": "export", "ham_import_png": "import_png", "ham_focus": "focus", "ham_say": "say"}


class NotReady(Exception):
    pass


def http(port, path, data, token, timeout=60):
    req = urllib.request.Request(f"http://127.0.0.1:{port}{path}", method="POST", data=json.dumps(data).encode(),
                                 headers={"Content-Type": "application/json", "X-HAM-Token": token})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except ValueError:
            return e.code, {"error": str(e)}


def find_app(start=True):
    for attempt in range(2):
        info = paths.read_json(paths.running_file(), {})
        if info.get("port"):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{info['port']}/api/ping", timeout=1.5) as r:
                    if json.loads(r.read()).get("app") == "highlyartmon":
                        return info
            except (OSError, ValueError):
                pass
        if attempt == 0 and start and not os.environ.get("HIGHLYARTMON_NO_AUTOSTART"):
            flags = {"creationflags": 0x00000008 | 0x00000200} if sys.platform == "win32" else {"start_new_session": True}
            pkg_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            env = {**os.environ, "PYTHONPATH": pkg_parent + os.pathsep + os.environ.get("PYTHONPATH", "")}
            args = ["serve"] + ([] if os.environ.get("HIGHLYARTMON_NO_WINDOW") else ["--window"])
            subprocess.Popen(paths.self_command(*args, console=False), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                             stdin=subprocess.DEVNULL, env=env, **flags)
            for _ in range(40):
                time.sleep(0.25)
                if paths.read_json(paths.running_file(), {}).get("port"):
                    break
    raise NotReady("HighlyArtMon is not running and could not be started. Ask the user to open it (Start menu: HighlyArtMon, or run `highlyartmon`).")


def call(tool, args):
    info = find_app()
    code, body = http(info["port"], f"/api/claude/{ACTION[tool]}", args, info["token"])
    if code != 200:
        raise ValueError(body.get("error", f"HTTP {code}"))
    return body


def result(tool, res):
    content = []
    if tool == "ham_guide":
        return [{"type": "text", "text": res["text"]}]
    if tool in ("ham_edit", "ham_view"):
        png = res.pop("png", None)
        cap = res.pop("caption", "")
        text = cap
        if tool == "ham_edit":
            text = f"v{res['version']} · " + "; ".join(res["log"]) + (f"\n{cap}" if cap else "")
        content.append({"type": "text", "text": text})
        if png:
            content.append({"type": "image", "data": png, "mimeType": "image/png"})
        return content
    if tool == "ham_lint":
        return [{"type": "text", "text": res["text"]}]
    if tool == "ham_read":
        d = res["doc"]
        return [{"type": "text", "text": json.dumps(d, ensure_ascii=False) + "\n\n" + res["legend"] + "\n" + res["grid"]}]
    return [{"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=1)}]


def main():
    for stream, kw in ((sys.stdin, {"encoding": "utf-8"}), (sys.stdout, {"encoding": "utf-8", "newline": "\n"})):
        try:
            stream.reconfigure(**kw)
        except (AttributeError, ValueError):
            pass
    out = sys.stdout

    def send(msg):
        try:
            out.write(json.dumps(msg, ensure_ascii=False) + "\n")
            out.flush()
        except (BrokenPipeError, OSError):
            raise SystemExit(0)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except ValueError:
            send({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "parse error"}})
            continue
        mid, method, params = msg.get("id"), msg.get("method", ""), msg.get("params") or {}
        if mid is None:
            continue
        if method == "initialize":
            want = params.get("protocolVersion")
            send({"jsonrpc": "2.0", "id": mid, "result": {
                "protocolVersion": want if want in PROTOCOLS else PROTOCOLS[0],
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "highlyartmon", "version": __version__},
                "instructions": "HighlyArtMon is the user's local pixel-art studio. Call ham_guide once before designing. Loop: plan palette ramps -> ham_new -> silhouette with grid ops -> ham_edit (you get a render back; look at it critically) -> refine shapes, light, outline -> ham_lint -> fix -> ham_export. The user watches every edit live and can paint too; use ham_read to see their changes. Write ham_edit notes in the user's language."}})
        elif method == "ping":
            send({"jsonrpc": "2.0", "id": mid, "result": {}})
        elif method == "tools/list":
            send({"jsonrpc": "2.0", "id": mid, "result": {"tools": TOOLS}})
        elif method == "tools/call":
            name, args = params.get("name"), params.get("arguments") or {}
            if name not in ACTION:
                send({"jsonrpc": "2.0", "id": mid, "error": {"code": -32602, "message": f"unknown tool {name}"}})
                continue
            try:
                content = result(name, call(name, dict(args)))
                send({"jsonrpc": "2.0", "id": mid, "result": {"content": content}})
            except (NotReady, ValueError, KeyError, OSError) as e:
                send({"jsonrpc": "2.0", "id": mid, "result": {"content": [{"type": "text", "text": f"Error: {e}"}], "isError": True}})
        else:
            send({"jsonrpc": "2.0", "id": mid, "error": {"code": -32601, "message": f"method not found: {method}"}})


assert set(OPS) >= {"grid", "outline", "light"}
