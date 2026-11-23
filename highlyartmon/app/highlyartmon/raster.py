"""Pure-Python RGBA images, PNG encode/decode and the review views Claude looks at."""
from __future__ import annotations

import math
import struct
import zlib

from .model import Sprite


class Image:
    def __init__(self, w, h, fill=(0, 0, 0, 0)):
        self.w, self.h = int(w), int(h)
        self.px = bytearray(bytes(fill) * (self.w * self.h))

    def set(self, x, y, rgba):
        if 0 <= x < self.w and 0 <= y < self.h:
            i = (y * self.w + x) * 4
            a = rgba[3]
            if a >= 255:
                self.px[i:i + 4] = bytes(rgba)
            elif a > 0:
                da = self.px[i + 3] / 255
                sa = a / 255
                oa = sa + da * (1 - sa)
                for k in range(3):
                    self.px[i + k] = int((rgba[k] * sa + self.px[i + k] * da * (1 - sa)) / oa) if oa else 0
                self.px[i + 3] = int(oa * 255)

    def rect(self, x, y, w, h, rgba):
        for yy in range(max(0, y), min(self.h, y + h)):
            row = bytes(rgba) * (min(self.w, x + w) - max(0, x))
            i = (yy * self.w + max(0, x)) * 4
            self.px[i:i + len(row)] = row

    def checker(self, x, y, w, h, cell=8, a=(58, 62, 74, 255), b=(70, 75, 89, 255)):
        for yy in range(max(0, y), min(self.h, y + h)):
            for xx in range(max(0, x), min(self.w, x + w)):
                c = a if ((xx - x) // cell + (yy - y) // cell) % 2 == 0 else b
                i = (yy * self.w + xx) * 4
                self.px[i:i + 4] = bytes(c)

    def paste(self, img, ox, oy, blend=True):
        for y in range(img.h):
            ty = oy + y
            if not 0 <= ty < self.h:
                continue
            for x in range(img.w):
                i = (y * img.w + x) * 4
                a = img.px[i + 3]
                if a == 0 and blend:
                    continue
                self.set(ox + x, ty, img.px[i:i + 4] if blend else bytes(img.px[i:i + 3]) + b"\xff")

    def scaled(self, k):
        k = max(1, int(k))
        if k == 1:
            return self
        out = Image(self.w * k, self.h * k)
        rowlen = self.w * k * 4
        for y in range(self.h):
            row = bytearray()
            for x in range(self.w):
                row += bytes(self.px[(y * self.w + x) * 4:(y * self.w + x) * 4 + 4]) * k
            for r in range(k):
                out.px[(y * k + r) * rowlen:(y * k + r + 1) * rowlen] = row
        return out

    def png(self) -> bytes:
        raw = bytearray()
        stride = self.w * 4
        for y in range(self.h):
            raw.append(0)
            raw += self.px[y * stride:(y + 1) * stride]

        def chunk(t, data):
            return struct.pack(">I", len(data)) + t + data + struct.pack(">I", zlib.crc32(t + data) & 0xFFFFFFFF)
        return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", self.w, self.h, 8, 6, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


def rgb(hexc):
    hexc = hexc.lstrip("#")
    return tuple(int(hexc[i:i + 2], 16) for i in (0, 2, 4))


def lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb(c) if isinstance(c, str) else c
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def cel_image(s: Sprite, cel, opacity=1.0, tint=None) -> Image:
    img = Image(s.w, s.h)
    pal = [rgb(c) if c else None for c in s.palette]
    a = int(255 * opacity)
    for i, v in enumerate(cel):
        if v and v < len(pal):
            c = pal[v]
            if tint:
                c = tuple(int(c[k] * 0.35 + tint[k] * 0.65) for k in range(3))
            img.px[i * 4:i * 4 + 4] = bytes((*c, a))
    return img


def composite(s: Sprite, fi: int, tint=None, alpha=1.0) -> Image:
    out = Image(s.w, s.h)
    for li, L in enumerate(s.layers):
        if L.get("visible", True):
            out.paste(cel_image(s, s.cel(li, fi, create=False), L.get("opacity", 1.0) * alpha, tint), 0, 0)
    return out


def silhouette(img: Image, color=(20, 20, 28, 255)) -> Image:
    out = Image(img.w, img.h)
    for i in range(img.w * img.h):
        if img.px[i * 4 + 3] > 0:
            out.px[i * 4:i * 4 + 4] = bytes(color)
    return out


def rotate_nn(img: Image, deg: float) -> Image:
    r = math.radians(deg)
    cs, sn = math.cos(r), math.sin(r)
    side = int(math.ceil(math.hypot(img.w, img.h))) + 1
    out = Image(side, side)
    cx, cy, ocx = (img.w - 1) / 2, (img.h - 1) / 2, (side - 1) / 2
    for y in range(side):
        for x in range(side):
            dx, dy = x - ocx, y - ocx
            sx, sy = round(cs * dx + sn * dy + cx), round(-sn * dx + cs * dy + cy)
            if 0 <= sx < img.w and 0 <= sy < img.h:
                i = (sy * img.w + sx) * 4
                out.px[(y * side + x) * 4:(y * side + x) * 4 + 4] = img.px[i:i + 4]
    return out


def stack_view(s: Sprite, fi: int, angle: float, spacing=1, squash=1.0) -> Image:
    """Sprite stacking (2.5D): each visible layer is a horizontal slice, bottom layer first."""
    slices = [cel_image(s, s.cel(li, fi, create=False), L.get("opacity", 1.0))
              for li, L in enumerate(s.layers) if L.get("visible", True)]
    side = int(math.ceil(math.hypot(s.w, s.h))) + 1
    sh = max(1, int(side * squash))
    out = Image(side, sh + spacing * len(slices) + 1)
    for n, sl in enumerate(slices):
        rot = rotate_nn(sl, angle)
        if squash != 1.0:
            sq = Image(rot.w, sh)
            for y in range(sh):
                sy = min(rot.h - 1, int(y / squash))
                sq.px[y * rot.w * 4:(y + 1) * rot.w * 4] = rot.px[sy * rot.w * 4:(sy + 1) * rot.w * 4]
            rot = sq
        out.paste(rot, 0, out.h - sh - n * spacing - 1)
    return out


def fit_scale(w, h, max_w=900, max_h=700, want=None):
    k = max(1, min(max_w // max(1, w), max_h // max(1, h)))
    return max(1, min(k, int(want))) if want else min(k, 12)


def view(s: Sprite, mode="review", frame=None, scale=None, angle=None) -> tuple:
    """Return (Image, caption). Modes: review, frame, sheet, silhouette, onion, stack, tile, actual."""
    fi = s.frame_index(frame)
    bg = rgb(s.d["meta"].get("bg", "#2b2f3a")) + (255,)
    comp = composite(s, fi)
    if mode == "actual":
        return comp, f"frame {fi} at 1x"
    if mode in ("frame", "silhouette"):
        k = fit_scale(s.w, s.h, want=scale)
        im = silhouette(comp) if mode == "silhouette" else comp
        out = Image(s.w * k, s.h * k, (236, 236, 240, 255) if mode == "silhouette" else (0, 0, 0, 0))
        if mode == "frame":
            out.checker(0, 0, out.w, out.h, cell=max(4, k * 2))
        out.paste(im.scaled(k), 0, 0)
        return out, f"{mode} frame {fi} at {k}x"
    if mode == "onion":
        k = fit_scale(s.w, s.h, want=scale)
        out = Image(s.w * k, s.h * k, bg)
        n = len(s.frames)
        if n > 1:
            out.paste(composite(s, (fi - 1) % n, tint=(255, 60, 60), alpha=0.45).scaled(k), 0, 0)
            out.paste(composite(s, (fi + 1) % n, tint=(60, 140, 255), alpha=0.45).scaled(k), 0, 0)
        out.paste(comp.scaled(k), 0, 0)
        return out, f"onion frame {fi}: red = previous, blue = next, at {k}x"
    if mode == "sheet":
        n = len(s.frames)
        k = fit_scale(s.w * n + n, s.h, max_w=1500, want=scale)
        out = Image((s.w * n + n - 1) * k, s.h * k, (20, 22, 28, 255))
        for i in range(n):
            out.checker(i * (s.w + 1) * k, 0, s.w * k, s.h * k, cell=max(4, k * 2))
            out.paste(composite(s, i).scaled(k), i * (s.w + 1) * k, 0)
        return out, f"sheet: {n} frames left->right at {k}x"
    if mode == "tile":
        k = fit_scale(s.w * 3, s.h * 3, want=scale)
        out = Image(s.w * 3 * k, s.h * 3 * k, bg)
        big = comp.scaled(k)
        for ty in range(3):
            for tx in range(3):
                out.paste(big, tx * s.w * k, ty * s.h * k)
        return out, f"tile 3x3 at {k}x (check seams)"
    if mode == "stack":
        angles = [angle] if angle is not None else [0, 45, 90, 135, 180, 225, 270, 315]
        views = [stack_view(s, fi, a, spacing=1, squash=0.6) for a in angles]
        vw, vh = views[0].w, max(v.h for v in views)
        k = fit_scale(vw * len(views), vh, max_w=1500, want=scale)
        out = Image(vw * len(views) * k, vh * k, bg)
        for i, v in enumerate(views):
            out.paste(v.scaled(k), i * vw * k, (vh - v.h) * k)
        return out, f"2.5D sprite stack ({len(s.layers)} slices) at angles {angles}, {k}x"
    # review board
    k = fit_scale(s.w, s.h, max_w=420, max_h=420, want=scale)
    W, H = s.w * k, s.h * k
    pad = 12
    n = len(s.frames)
    sk = max(1, min(k, 1400 // max(1, (s.w + 1) * n)))
    sheet_h = s.h * sk + pad if n > 1 else 0
    board = Image(pad + (W + pad) * 3 + s.w * 2 + pad, pad + H + pad + sheet_h, (16, 17, 22, 255))
    big = comp.scaled(k)
    board.checker(pad, pad, W, H, cell=max(4, k * 2))
    board.paste(big, pad, pad)
    x2 = pad * 2 + W
    board.rect(x2, pad, W, H, bg)
    board.paste(big, x2, pad)
    x3 = x2 + W + pad
    board.rect(x3, pad, W, H, (236, 236, 240, 255))
    board.paste(silhouette(comp).scaled(k), x3, pad)
    x4 = x3 + W + pad
    board.rect(x4, pad, s.w * 2, s.h * 3 + 4, bg)
    board.paste(comp, x4, pad)
    board.paste(comp.scaled(2), x4, pad + s.h + 4)
    if board.h < pad + s.h * 3 + 4 + pad:  # very small k: grow the board so the 1x/2x column fits
        grown = Image(board.w, pad + s.h * 3 + 4 + pad + sheet_h, (16, 17, 22, 255))
        grown.paste(board, 0, 0, blend=False)
        board = grown
    if n > 1:
        for i in range(n):
            board.checker(pad + i * (s.w + 1) * sk, pad * 2 + H, s.w * sk, s.h * sk, cell=max(4, sk * 2))
            board.paste(composite(s, i).scaled(sk), pad + i * (s.w + 1) * sk, pad * 2 + H)
    cap = (f"review of frame {fi} ({s.w}x{s.h}): [1] {k}x on transparency  [2] {k}x on game bg {s.d['meta'].get('bg')}  "
           f"[3] silhouette  [4] real size 1x (and 2x)" + (f"; bottom row: all {n} frames" if n > 1 else ""))
    return board, cap


# ---------------- PNG decode (for importing generated art)

def decode_png(data: bytes) -> Image:
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG file")
    pos, idat, plte, trns = 8, bytearray(), None, None
    w = h = depth = ctype = 0
    while pos < len(data):
        ln, = struct.unpack(">I", data[pos:pos + 4])
        t, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + ln]
        pos += 12 + ln
        if t == b"IHDR":
            w, h, depth, ctype, _, _, inter = struct.unpack(">IIBBBBB", body)
            if inter:
                raise ValueError("interlaced PNG not supported; re-save without interlace")
        elif t == b"PLTE":
            plte = body
        elif t == b"tRNS":
            trns = body
        elif t == b"IDAT":
            idat += body
        elif t == b"IEND":
            break
    if w * h > 2048 * 2048:
        raise ValueError("image too large (max 2048x2048)")
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    if depth == 16:
        raise ValueError("16-bit PNG not supported")
    bpp = max(1, ch * depth // 8)
    stride = (w * ch * depth + 7) // 8
    raw = zlib.decompress(bytes(idat))
    out = bytearray()
    prev = bytearray(stride)
    p = 0
    for _ in range(h):
        f = raw[p]
        line = bytearray(raw[p + 1:p + 1 + stride])
        p += 1 + stride
        for i in range(stride):
            a = line[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            if f == 1:
                line[i] = (line[i] + a) & 255
            elif f == 2:
                line[i] = (line[i] + b) & 255
            elif f == 3:
                line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        out += line
        prev = line
    img = Image(w, h)
    for y in range(h):
        row = out[y * stride:(y + 1) * stride]
        for x in range(w):
            if depth < 8:
                per = 8 // depth
                v = (row[x // per] >> (8 - depth * (x % per + 1))) & ((1 << depth) - 1)
                vals = [v]
            else:
                vals = row[x * ch:(x + 1) * ch]
            if ctype == 3:
                i = vals[0]
                r, g, b = plte[i * 3:i * 3 + 3]
                a = trns[i] if trns and i < len(trns) else 255
            elif ctype == 0:
                r = g = b = vals[0] * (255 // ((1 << depth) - 1)) if depth < 8 else vals[0]
                a = 255
            elif ctype == 4:
                r = g = b = vals[0]
                a = vals[1]
            elif ctype == 2:
                r, g, b = vals
                a = 255
            else:
                r, g, b, a = vals
            img.px[(y * w + x) * 4:(y * w + x) * 4 + 4] = bytes((r, g, b, a))
    return img


def quantize(img: Image, max_colors=32, palette=None, alpha_cut=128):
    """Map an RGBA image to palette indices. Returns (palette list [None, ...], indices bytearray)."""
    pts = []
    for i in range(img.w * img.h):
        if img.px[i * 4 + 3] >= alpha_cut:
            pts.append(tuple(img.px[i * 4:i * 4 + 3]))
    if palette is None:
        uniq = {}
        for c in pts:
            uniq[c] = uniq.get(c, 0) + 1
        if len(uniq) <= max_colors:
            cols = sorted(uniq, key=lambda c: -uniq[c])
        else:  # k-means seeded with the most frequent, well-separated colors
            seeds = []
            for c in sorted(uniq, key=lambda c: -uniq[c]):
                if all(sum((a - b) ** 2 for a, b in zip(c, s)) > 900 for s in seeds):
                    seeds.append(c)
                if len(seeds) == max_colors:
                    break
            cols = [tuple(map(float, s)) for s in seeds]
            items = list(uniq.items())
            for _ in range(8):
                acc = [[0.0, 0.0, 0.0, 0] for _ in cols]
                for c, n in items:
                    j = min(range(len(cols)), key=lambda j: sum((a - b) ** 2 for a, b in zip(c, cols[j])))
                    for k in range(3):
                        acc[j][k] += c[k] * n
                    acc[j][3] += n
                cols = [tuple(a[k] / a[3] for k in range(3)) if a[3] else cols[j] for j, a in enumerate(acc)]
            cols = [tuple(int(round(v)) for v in c) for c in cols]
        palette = [None] + ["#%02x%02x%02x" % c for c in cols]
    prgb = [rgb(c) for c in palette[1:]]
    cache = {}
    idx = bytearray(img.w * img.h)
    for i in range(img.w * img.h):
        if img.px[i * 4 + 3] < alpha_cut:
            continue
        c = tuple(img.px[i * 4:i * 4 + 3])
        if c not in cache:
            cache[c] = 1 + min(range(len(prgb)), key=lambda j: sum((a - b) ** 2 for a, b in zip(c, prgb[j])))
        idx[i] = cache[c]
    return palette, idx
