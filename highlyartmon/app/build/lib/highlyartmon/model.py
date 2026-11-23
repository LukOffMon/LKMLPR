"""Sprite document model and drawing operations.

A document (.ham.json) is palette-indexed: palette[0] is always transparent, every pixel is an index 0-255.
Cels (one per layer x frame) are stored as hex strings, two characters per pixel, row-major.
"""
from __future__ import annotations

import copy
import json
import os
import re
import time
import uuid
from collections import deque

FORMAT = 1
MAX_SIDE = 1024
MAX_FRAMES = 512
MAX_LAYERS = 64
CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"  # grid chars -> indices 0..61; '.' = 0
NAME_RE = re.compile(r"^[A-Za-z0-9_\-]{1,64}$")

_PAL_FILE = os.path.join(os.path.dirname(__file__), "ui", "palettes.json")


def presets() -> dict:
    with open(_PAL_FILE, encoding="utf-8") as f:
        return json.load(f)


def _nid() -> str:
    return uuid.uuid4().hex[:8]


def hex_color(c: str) -> str:
    c = str(c).strip().lstrip("#").lower()
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    if not re.fullmatch(r"[0-9a-f]{6}", c):
        raise ValueError(f"bad color {c!r}: use #rrggbb")
    return "#" + c


def resolve_palette(p) -> list:
    """Palette input -> list with None (transparent) at index 0 then #rrggbb colors."""
    if p is None:
        p = "endesga32"
    if isinstance(p, str):
        pr = presets()
        if p not in pr:
            raise ValueError(f"unknown palette {p!r}; presets: {', '.join(pr)}")
        p = pr[p]
    cols = [hex_color(c) for c in p if c not in (None, "", "transparent")]
    if not 1 <= len(cols) <= 255:
        raise ValueError("palette needs 1-255 colors")
    return [None] + cols


def check_name(name: str) -> str:
    if not NAME_RE.match(name or ""):
        raise ValueError("name: 1-64 chars, letters, digits, _ or - (e.g. spr_player_run)")
    return name


class Sprite:
    def __init__(self, data: dict):
        self.d = data
        self._cels = {k: bytearray.fromhex(v) for k, v in data.get("cels", {}).items()}

    # ---------- construction / io
    @classmethod
    def new(cls, name, width=32, height=32, palette=None, frames=1, layers=None, mode="2d", bg="#2b2f3a", origin=None):
        check_name(name)
        width, height = int(width), int(height)
        if not (1 <= width <= MAX_SIDE and 1 <= height <= MAX_SIDE):
            raise ValueError(f"size must be 1..{MAX_SIDE}")
        layers = layers or ["base"]
        d = {"app": "highlyartmon", "format": FORMAT, "name": name, "width": width, "height": height,
             "palette": resolve_palette(palette),
             "layers": [{"id": _nid(), "name": str(n), "visible": True, "opacity": 1.0} for n in layers],
             "frames": [{"id": _nid(), "duration": 100} for _ in range(max(1, int(frames)))],
             "tags": [], "origin": origin or [width // 2, height - 1],
             "meta": {"mode": mode, "bg": hex_color(bg), "notes": ""},
             "version": 0, "updated": time.time(), "cels": {}}
        return cls(d)

    def to_dict(self) -> dict:
        out = {k: v for k, v in self.d.items() if k != "cels"}
        blank = bytes(self.w * self.h)
        out["cels"] = {k: v.hex() for k, v in self._cels.items() if bytes(v) != blank}
        return out

    @classmethod
    def from_dict(cls, data: dict) -> "Sprite":
        if data.get("app") != "highlyartmon":
            raise ValueError("not a HighlyArtMon document")
        data = copy.deepcopy(data)
        s = cls(data)
        n = s.w * s.h
        for k, v in list(s._cels.items()):
            if len(v) != n:
                raise ValueError(f"cel {k} has {len(v)} pixels, expected {n}")
        if len(s.palette) > 256:
            raise ValueError("palette too large")
        return s

    # ---------- accessors
    @property
    def w(self): return self.d["width"]

    @property
    def h(self): return self.d["height"]

    @property
    def palette(self): return self.d["palette"]

    @property
    def layers(self): return self.d["layers"]

    @property
    def frames(self): return self.d["frames"]

    def _find(self, items, ref, kind, default=0):
        if ref is None:
            return default
        if isinstance(ref, int) or (isinstance(ref, str) and ref.lstrip("-").isdigit()):
            i = int(ref)
            if i < 0:
                i += len(items)
            if 0 <= i < len(items):
                return i
            raise ValueError(f"{kind} index {ref} out of range (0..{len(items) - 1})")
        for i, it in enumerate(items):
            if it["id"] == ref or it.get("name") == ref:
                return i
        raise ValueError(f"no {kind} named {ref!r}")

    def layer_index(self, ref=None): return self._find(self.layers, ref, "layer")

    def frame_index(self, ref=None): return self._find(self.frames, ref, "frame")

    def cel(self, li: int, fi: int, create=True) -> bytearray:
        key = f"{self.layers[li]['id']}:{self.frames[fi]['id']}"
        c = self._cels.get(key)
        if c is None:
            c = bytearray(self.w * self.h)
            if create:
                self._cels[key] = c
        return c

    def get(self, cel, x, y):
        return cel[y * self.w + x] if 0 <= x < self.w and 0 <= y < self.h else 0

    # ---------- text grid
    def to_grid(self, li=None, fi=None, region=None, composite=False) -> str:
        fi = self.frame_index(fi)
        if composite:
            px = self.flatten(fi)
        else:
            px = self.cel(self.layer_index(li), fi, create=False)
        x0, y0, x1, y1 = region or (0, 0, self.w, self.h)
        rows = []
        for y in range(max(0, y0), min(self.h, y1)):
            row = []
            for x in range(max(0, x0), min(self.w, x1)):
                v = px[y * self.w + x]
                row.append("." if v == 0 else (CHARS[v] if v < len(CHARS) else "#"))
            rows.append("".join(row))
        return "\n".join(rows)

    def flatten(self, fi) -> bytearray:
        """Top-most visible non-transparent index per pixel (ignores opacity)."""
        out = bytearray(self.w * self.h)
        for li in range(len(self.layers)):
            if not self.layers[li].get("visible", True):
                continue
            c = self.cel(li, fi, create=False)
            for i, v in enumerate(c):
                if v:
                    out[i] = v
        return out

    def bbox(self, px):
        xs, ys = [], []
        for i, v in enumerate(px):
            if v:
                ys.append(i // self.w)
                xs.append(i % self.w)
        if not xs:
            return None
        return min(xs), min(ys), max(xs), max(ys)

    # ---------- operations
    def apply(self, ops: list) -> list:
        """Apply a list of ops atomically. Returns a short log line per op."""
        if not isinstance(ops, list) or not ops:
            raise ValueError("ops must be a non-empty list")
        backup = (copy.deepcopy(self.d), {k: bytearray(v) for k, v in self._cels.items()})
        log = []
        try:
            for n, op in enumerate(ops):
                if not isinstance(op, dict) or "op" not in op:
                    raise ValueError(f"op #{n}: each op is an object with an 'op' field")
                fn = getattr(self, "op_" + str(op["op"]), None)
                if fn is None:
                    raise ValueError(f"op #{n}: unknown op {op['op']!r}. Known: {', '.join(OPS)}")
                try:
                    log.append(fn(op) or op["op"])
                except (KeyError, TypeError) as e:
                    raise ValueError(f"op #{n} ({op['op']}): missing or bad field {e}") from None
                except ValueError as e:
                    raise ValueError(f"op #{n} ({op['op']}): {e}") from None
        except Exception:
            self.d, self._cels = backup
            raise
        self.d["version"] = self.d.get("version", 0) + 1
        self.d["updated"] = time.time()
        return log

    def _target(self, op):
        li, fi = self.layer_index(op.get("layer")), self.frame_index(op.get("frame"))
        return self.cel(li, fi), li, fi

    def _color(self, op, key="c"):
        c = int(op.get(key, 1))
        if not 0 <= c < len(self.palette):
            raise ValueError(f"color index {c} not in palette (0..{len(self.palette) - 1}); 0 = transparent")
        return c

    def _plot(self, cel, x, y, c, sym=None):
        pts = [(x, y)]
        if sym in ("x", "xy"):
            pts.append((self.w - 1 - x, y))
        if sym in ("y", "xy"):
            pts += [(px, self.h - 1 - py) for px, py in list(pts)]
        for px, py in pts:
            if 0 <= px < self.w and 0 <= py < self.h:
                cel[py * self.w + px] = c

    def op_pixels(self, op):
        cel, *_ = self._target(op)
        default = op.get("c")
        for p in op["points"]:
            c = p[2] if len(p) > 2 else default
            if c is None:
                raise ValueError("each point needs [x,y,c] or give a shared 'c'")
            self._plot(cel, int(p[0]), int(p[1]), self._color({"c": c}), op.get("symmetry"))
        return f"pixels x{len(op['points'])}"

    def op_line(self, op):
        cel, *_ = self._target(op)
        c = self._color(op)
        pts = line_points(int(op["x0"]), int(op["y0"]), int(op["x1"]), int(op["y1"]))
        for x, y in pts:
            self._plot(cel, x, y, c, op.get("symmetry"))
        return f"line {len(pts)}px"

    def op_polyline(self, op):
        cel, *_ = self._target(op)
        c = self._color(op)
        p = op["points"]
        for a, b in zip(p, p[1:] + ([p[0]] if op.get("closed") else [])):
            for x, y in line_points(int(a[0]), int(a[1]), int(b[0]), int(b[1])):
                self._plot(cel, x, y, c, op.get("symmetry"))
        return f"polyline {len(p)} pts"

    def op_rect(self, op):
        cel, *_ = self._target(op)
        c = self._color(op)
        x, y, w, h = int(op["x"]), int(op["y"]), int(op["w"]), int(op["h"])
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if op.get("fill", False) or yy in (y, y + h - 1) or xx in (x, x + w - 1):
                    self._plot(cel, xx, yy, c, op.get("symmetry"))
        return f"rect {w}x{h}"

    def op_ellipse(self, op):
        cel, *_ = self._target(op)
        c = self._color(op)
        x, y, w, h = int(op["x"]), int(op["y"]), int(op["w"]), int(op["h"])
        for px, py in ellipse_points(x, y, w, h, bool(op.get("fill", False))):
            self._plot(cel, px, py, c, op.get("symmetry"))
        return f"ellipse {w}x{h}"

    def op_fill(self, op):
        cel, *_ = self._target(op)
        c = self._color(op)
        x, y = int(op["x"]), int(op["y"])
        if not (0 <= x < self.w and 0 <= y < self.h):
            raise ValueError("fill start outside canvas")
        target = cel[y * self.w + x]
        if target == c:
            return "fill 0px"
        diag = bool(op.get("diagonal", False))
        q, n = deque([(x, y)]), 0
        cel[y * self.w + x] = c
        nb = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (1, -1), (-1, 1), (-1, -1)] if diag else [])
        while q:
            cx, cy = q.popleft()
            n += 1
            for dx, dy in nb:
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < self.w and 0 <= ny < self.h and cel[ny * self.w + nx] == target:
                    cel[ny * self.w + nx] = c
                    q.append((nx, ny))
        return f"fill {n}px"

    def op_grid(self, op):
        """Paint text rows. Chars 0-9a-zA-Z = palette index, '.' = transparent. mode 'over' skips '.' and ' '."""
        cel, *_ = self._target(op)
        x0, y0 = int(op.get("x", 0)), int(op.get("y", 0))
        legend = {str(k): int(v) for k, v in (op.get("legend") or {}).items()}
        over = op.get("mode", "replace") == "over"
        rows = op["rows"]
        if isinstance(rows, str):
            rows = rows.strip("\n").split("\n")
        n = 0
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch in legend:
                    v = legend[ch]
                elif ch in ". ":
                    if over:
                        continue
                    v = 0
                elif ch in CHARS:
                    v = CHARS.index(ch)
                else:
                    raise ValueError(f"row {dy}: char {ch!r} has no meaning; add it to 'legend'")
                if v >= len(self.palette):
                    raise ValueError(f"row {dy}: index {v} ({ch!r}) not in palette (size {len(self.palette)})")
                self._plot(cel, x0 + dx, y0 + dy, v, op.get("symmetry"))
                n += 1
        return f"grid {len(rows)} rows, {n}px"

    def op_clear(self, op):
        cel, *_ = self._target(op)
        c = self._color(op) if "c" in op else 0
        cel[:] = bytes([c]) * len(cel)
        return "clear"

    def op_replace(self, op):
        a, b = self._color(op, "from"), self._color(op, "to")
        cels = [self.cel(*self._target(op)[1:])] if not op.get("all_cels") else list(self._cels.values())
        n = 0
        for cel in cels:
            for i, v in enumerate(cel):
                if v == a:
                    cel[i] = b
                    n += 1
        return f"replace {n}px"

    def op_outline(self, op):
        """Add a 1px outline. mode outer (around shape) or inner (on the shape's border pixels)."""
        cel, *_ = self._target(op)
        c = self._color(op)
        diag = bool(op.get("diagonal", False))
        nb = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (1, -1), (-1, 1), (-1, -1)] if diag else [])
        src = bytes(cel)
        inner = op.get("mode", "outer") == "inner"
        n = 0
        for y in range(self.h):
            for x in range(self.w):
                v = src[y * self.w + x]
                around = [src[(y + dy) * self.w + x + dx] if 0 <= x + dx < self.w and 0 <= y + dy < self.h else 0 for dx, dy in nb]
                if inner and v and 0 in around:
                    cel[y * self.w + x] = c
                    n += 1
                elif not inner and not v and any(around):
                    cel[y * self.w + x] = c
                    n += 1
        return f"outline {n}px"

    def op_flip(self, op):
        cel, *_ = self._target(op)
        w, h = self.w, self.h
        src = bytes(cel)
        for y in range(h):
            for x in range(w):
                sx, sy = (w - 1 - x, y) if op.get("axis", "x") == "x" else (x, h - 1 - y)
                cel[y * w + x] = src[sy * w + sx]
        return f"flip {op.get('axis', 'x')}"

    def op_mirror(self, op):
        """Copy one half onto the other: axis x copies left->right (side 'left') or right->left."""
        cel, *_ = self._target(op)
        w, h = self.w, self.h
        axis, side = op.get("axis", "x"), op.get("side", "left" if op.get("axis", "x") == "x" else "top")
        for y in range(h):
            for x in range(w):
                if axis == "x":
                    if (side == "left" and x >= w - x - 1) or (side == "right" and x <= w - x - 1):
                        continue
                    cel[y * w + (w - 1 - x)] = cel[y * w + x]
                else:
                    if (side == "top" and y >= h - y - 1) or (side == "bottom" and y <= h - y - 1):
                        continue
                    cel[(h - 1 - y) * w + x] = cel[y * w + x]
        return f"mirror {axis} from {side}"

    def op_shift(self, op):
        cel, *_ = self._target(op)
        dx, dy, wrap = int(op.get("dx", 0)), int(op.get("dy", 0)), bool(op.get("wrap", False))
        src = bytes(cel)
        w, h = self.w, self.h
        for y in range(h):
            for x in range(w):
                sx, sy = x - dx, y - dy
                if wrap:
                    sx, sy = sx % w, sy % h
                cel[y * w + x] = src[sy * w + sx] if 0 <= sx < w and 0 <= sy < h else 0
        return f"shift {dx},{dy}"

    def op_copy(self, op):
        """Copy a cel (from_layer/from_frame) into the target cel; 'over' keeps target pixels under transparency."""
        cel, *_ = self._target(op)
        src = self.cel(self.layer_index(op.get("from_layer", op.get("layer"))), self.frame_index(op.get("from_frame", op.get("frame"))), create=False)
        over = op.get("mode", "replace") == "over"
        for i, v in enumerate(bytes(src)):
            if v or not over:
                cel[i] = v
        return "copy cel"

    def op_dither(self, op):
        cel, *_ = self._target(op)
        c = self._color(op)
        pat = op.get("pattern", "checker")
        masks = {"checker": lambda x, y: (x + y) % 2 == 0, "25": lambda x, y: x % 2 == 0 and y % 2 == 0,
                 "75": lambda x, y: not (x % 2 == 1 and y % 2 == 1), "lines": lambda x, y: y % 2 == 0}
        if pat not in masks:
            raise ValueError(f"pattern: {', '.join(masks)}")
        x0, y0, w, h = int(op.get("x", 0)), int(op.get("y", 0)), int(op.get("w", self.w)), int(op.get("h", self.h))
        only = op.get("only")  # restrict to pixels currently of this index
        n = 0
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                if 0 <= x < self.w and 0 <= y < self.h and masks[pat](x, y):
                    if only is not None and cel[y * self.w + x] != int(only):
                        continue
                    cel[y * self.w + x] = c
                    n += 1
        return f"dither {pat} {n}px"

    def op_ramp_shift(self, op):
        """Move pixels along a color ramp (dark->light list of indices) by 'amount' inside an optional region/mask."""
        cel, *_ = self._target(op)
        ramp = [int(i) for i in op["ramp"]]
        amt = int(op.get("amount", 1))
        x0, y0, w, h = int(op.get("x", 0)), int(op.get("y", 0)), int(op.get("w", self.w)), int(op.get("h", self.h))
        pts = op.get("points")
        coords = [(int(p[0]), int(p[1])) for p in pts] if pts else [(x, y) for y in range(y0, y0 + h) for x in range(x0, x0 + w)]
        n = 0
        for x, y in coords:
            if 0 <= x < self.w and 0 <= y < self.h:
                v = cel[y * self.w + x]
                if v in ramp:
                    j = max(0, min(len(ramp) - 1, ramp.index(v) + amt))
                    if ramp[j] != v:
                        cel[y * self.w + x] = ramp[j]
                        n += 1
        return f"ramp_shift {n}px"

    def op_light(self, op):
        """Auto-shade a shape: pixels whose neighbor toward the light is empty get lighter, away from it darker."""
        cel, *_ = self._target(op)
        ramp = [int(i) for i in op["ramp"]]
        lx, ly = op.get("dir", [-1, -1])
        src = bytes(cel)
        n = 0
        for y in range(self.h):
            for x in range(self.w):
                v = src[y * self.w + x]
                if v not in ramp:
                    continue
                toward = self.get(src, x + lx, y + ly)
                away = self.get(src, x - lx, y - ly)
                j = ramp.index(v)
                if toward == 0 and away != 0:
                    j += 1
                elif away == 0 and toward != 0:
                    j -= 1
                j = max(0, min(len(ramp) - 1, j))
                if ramp[j] != v:
                    cel[y * self.w + x] = ramp[j]
                    n += 1
        return f"light {n}px"

    def op_cleanup(self, op):
        """Remove orphan pixels (no same-colored 8-neighbor and surrounded by another single color)."""
        cel, *_ = self._target(op)
        src = bytes(cel)
        n = 0
        for y in range(self.h):
            for x in range(self.w):
                v = src[y * self.w + x]
                if not v:
                    continue
                nbs = [self.get(src, x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
                if v not in nbs:
                    common = max(set(nbs), key=nbs.count)
                    if nbs.count(common) >= 6:
                        cel[y * self.w + x] = common
                        n += 1
        return f"cleanup {n}px"

    # ---- structure
    def op_add_frame(self, op):
        if len(self.frames) >= MAX_FRAMES:
            raise ValueError("too many frames")
        at = self.frame_index(op["after"]) + 1 if "after" in op else len(self.frames)
        fr = {"id": _nid(), "duration": int(op.get("duration", self.frames[-1]["duration"]))}
        self.frames.insert(at, fr)
        if "copy_from" in op:
            src = self.frame_index(op["copy_from"])
            src = src + 1 if src >= at else src
            for li in range(len(self.layers)):
                self.cel(li, at)[:] = self.cel(li, src, create=False)
        return f"add_frame at {at}"

    def op_delete_frame(self, op):
        if len(self.frames) == 1:
            raise ValueError("a sprite needs at least one frame")
        i = self.frame_index(op["frame"])
        fid = self.frames.pop(i)["id"]
        self._cels = {k: v for k, v in self._cels.items() if not k.endswith(":" + fid)}
        return f"delete_frame {i}"

    def op_move_frame(self, op):
        i, to = self.frame_index(op["frame"]), int(op["to"])
        self.frames.insert(max(0, min(len(self.frames) - 1, to)), self.frames.pop(i))
        return f"move_frame {i}->{to}"

    def op_frame_duration(self, op):
        ms = int(op["ms"])
        for i in ([self.frame_index(op["frame"])] if "frame" in op else range(len(self.frames))):
            self.frames[i]["duration"] = max(10, ms)
        return f"duration {ms}ms"

    def op_add_layer(self, op):
        if len(self.layers) >= MAX_LAYERS:
            raise ValueError("too many layers")
        at = self.layer_index(op["above"]) + 1 if "above" in op else len(self.layers)
        self.layers.insert(at, {"id": _nid(), "name": str(op.get("name", f"layer{len(self.layers)}")), "visible": True, "opacity": 1.0})
        return f"add_layer {self.layers[at]['name']}"

    def op_delete_layer(self, op):
        if len(self.layers) == 1:
            raise ValueError("a sprite needs at least one layer")
        i = self.layer_index(op["layer"])
        lid = self.layers.pop(i)["id"]
        self._cels = {k: v for k, v in self._cels.items() if not k.startswith(lid + ":")}
        return f"delete_layer {i}"

    def op_layer(self, op):
        """Edit layer props: name, visible, opacity, move_to."""
        i = self.layer_index(op["layer"])
        L = self.layers[i]
        for k in ("name", "visible"):
            if k in op:
                L[k] = op[k] if k == "visible" else str(op[k])
        if "opacity" in op:
            L["opacity"] = max(0.0, min(1.0, float(op["opacity"])))
        if "move_to" in op:
            self.layers.insert(max(0, min(len(self.layers) - 1, int(op["move_to"]))), self.layers.pop(i))
        return f"layer {L['name']}"

    def op_merge_down(self, op):
        i = self.layer_index(op["layer"])
        if i == 0:
            raise ValueError("bottom layer has nothing below")
        for fi in range(len(self.frames)):
            top, bot = self.cel(i, fi, create=False), self.cel(i - 1, fi)
            for k, v in enumerate(bytes(top)):
                if v:
                    bot[k] = v
        return self.op_delete_layer({"layer": i})

    def op_palette(self, op):
        """Set the palette (preset name or list), or 'set': {index: color}, or 'add': [colors]."""
        if "colors" in op or "preset" in op:
            new = resolve_palette(op.get("colors", op.get("preset")))
            if len(new) < len(self.palette) and not op.get("force"):
                used = max((max(c) for c in self._cels.values() if c), default=0)
                if used >= len(new):
                    raise ValueError(f"pixels use index {used}; new palette has {len(new) - 1} colors (pass force: true)")
            self.d["palette"] = new
        for k, v in (op.get("set") or {}).items():
            k = int(k)
            if not 1 <= k < len(self.palette):
                raise ValueError(f"set index {k} out of palette")
            self.palette[k] = hex_color(v)
        for c in op.get("add") or []:
            if len(self.palette) >= 256:
                raise ValueError("palette full (255 colors)")
            self.palette.append(hex_color(c))
        return f"palette {len(self.palette) - 1} colors"

    def op_resize(self, op):
        w, h = int(op["w"]), int(op["h"])
        if not (1 <= w <= MAX_SIDE and 1 <= h <= MAX_SIDE):
            raise ValueError(f"size must be 1..{MAX_SIDE}")
        anchor = op.get("anchor", "center")
        ox = 0 if "left" in anchor else (w - self.w if "right" in anchor else (w - self.w) // 2)
        oy = 0 if "top" in anchor else (h - self.h if "bottom" in anchor else (h - self.h) // 2)
        new = {}
        for k, c in self._cels.items():
            n = bytearray(w * h)
            for y in range(self.h):
                for x in range(self.w):
                    nx, ny = x + ox, y + oy
                    if 0 <= nx < w and 0 <= ny < h:
                        n[ny * w + nx] = c[y * self.w + x]
            new[k] = n
        self._cels = new
        self.d["origin"] = [self.d["origin"][0] + ox, self.d["origin"][1] + oy]
        self.d["width"], self.d["height"] = w, h
        return f"resize {w}x{h}"

    def op_origin(self, op):
        self.d["origin"] = [int(op["x"]), int(op["y"])]
        return f"origin {op['x']},{op['y']}"

    def op_tag(self, op):
        """Name an animation range (inclusive frame indices): name, from, to. delete: true removes it."""
        tags = [t for t in self.d["tags"] if t["name"] != op["name"]]
        if not op.get("delete"):
            a, b = self.frame_index(op["from"]), self.frame_index(op["to"])
            tags.append({"name": str(op["name"]), "from": min(a, b), "to": max(a, b)})
        self.d["tags"] = tags
        return f"tag {op['name']}"

    def op_meta(self, op):
        for k in ("mode", "notes"):
            if k in op:
                self.d["meta"][k] = str(op[k])
        if "bg" in op:
            self.d["meta"]["bg"] = hex_color(op["bg"])
        return "meta"


OPS = sorted(n[3:] for n in dir(Sprite) if n.startswith("op_"))


def line_points(x0, y0, x1, y1):
    pts = []
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            return pts
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def ellipse_points(x, y, w, h, fill):
    """Pixel-clean ellipse inside the box (x, y, w, h)."""
    if w <= 0 or h <= 0:
        return []
    cx, cy, rx, ry = x + (w - 1) / 2, y + (h - 1) / 2, w / 2, h / 2
    inside = set()
    for py in range(y, y + h):
        for px in range(x, x + w):
            if ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1.0 + 1e-9:
                inside.add((px, py))
    if fill:
        return sorted(inside)
    return sorted(p for p in inside if any((p[0] + dx, p[1] + dy) not in inside for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))))
