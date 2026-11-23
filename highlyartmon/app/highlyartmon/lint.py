"""Automatic pixel-art review: the mistakes that make sprites look amateur."""
from __future__ import annotations

from .model import Sprite
from .raster import lum, rgb


def _nb8(px, w, h, x, y):
    return [px[(y + dy) * w + x + dx] if 0 <= x + dx < w and 0 <= y + dy < h else 0
            for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dx or dy]


def lint(s: Sprite) -> dict:
    w, h = s.w, s.h
    issues = []
    stats = {"frames": []}

    def add(level, code, msg, frame=None, at=None):
        issues.append({"level": level, "code": code, "msg": msg, **({"frame": frame} if frame is not None else {}),
                       **({"at": at[:12]} if at else {})})

    boxes = []
    used = set()
    for fi in range(len(s.frames)):
        px = s.flatten(fi)
        used |= set(px)
        bb = s.bbox(px)
        boxes.append(bb)
        stats["frames"].append({"frame": fi, "bbox": bb, "pixels": sum(1 for v in px if v)})
        if bb is None:
            add("warn", "empty", "frame is empty", fi)
            continue
        orphans, doubles, jaggies = [], [], []
        edge_colors = {}
        for y in range(h):
            for x in range(w):
                v = px[y * w + x]
                if not v:
                    continue
                nbs = _nb8(px, w, h, x, y)
                n4 = [nbs[1], nbs[3], nbs[4], nbs[6]]
                if 0 in n4:
                    edge_colors[v] = edge_colors.get(v, 0) + 1
                if v not in nbs and sum(1 for n in nbs if n) >= 5:
                    orphans.append([x, y])
        outline = max(edge_colors, key=edge_colors.get) if edge_colors else None
        if outline:
            for y in range(h - 1):
                for x in range(w - 1):
                    q = [px[y * w + x], px[y * w + x + 1], px[(y + 1) * w + x], px[(y + 1) * w + x + 1]]
                    if all(v == outline for v in q):
                        touches = any(0 in _nb8(px, w, h, xx, yy) for xx, yy in ((x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)))
                        if touches:
                            doubles.append([x, y])
            # jaggies: an outline pixel that has outline neighbours both horizontally and vertically (an "L" corner)
            for y in range(1, h - 1):
                for x in range(1, w - 1):
                    if px[y * w + x] != outline:
                        continue
                    hz = px[y * w + x - 1] == outline or px[y * w + x + 1] == outline
                    vt = px[(y - 1) * w + x] == outline or px[(y + 1) * w + x] == outline
                    same = sum(1 for n in _nb8(px, w, h, x, y) if n == outline)
                    if hz and vt and same == 2:
                        jaggies.append([x, y])
        if orphans:
            add("warn", "orphan", f"{len(orphans)} orphan pixel(s): a lone color surrounded by others reads as noise. Merge them into a cluster or remove (op cleanup).", fi, orphans)
        if doubles:
            add("warn", "double_outline", f"{len(doubles)} spot(s) where the outline (index {outline}) is 2px thick. Keep outlines 1px unless intentional.", fi, doubles)
        if len(jaggies) > max(3, (bb[2] - bb[0] + bb[3] - bb[1]) // 6):
            add("info", "jaggies", f"{len(jaggies)} L-shaped outline corners: curves look smoother with consistent step lengths (1-1-2-2-3...).", fi, jaggies)
        stats["frames"][fi]["outline"] = outline
    # frame drift (feet and center)
    real = [b for b in boxes if b]
    if len(real) > 1:
        bottoms = [b[3] for b in real]
        centers = [(b[0] + b[2]) / 2 for b in real]
        if max(bottoms) - min(bottoms) > 1:
            add("warn", "drift_y", f"feet line moves between frames (bottom y {min(bottoms)}..{max(bottoms)}). If unintended (idle/walk), align frames to the same ground.")
        if max(centers) - min(centers) > 2.5:
            add("info", "drift_x", f"horizontal center shifts {max(centers) - min(centers):.1f}px across frames; fine for attacks, suspicious for idle/walk.")
    # palette checks
    bad = [v for v in used if v >= len(s.palette)]
    if bad:
        add("error", "off_palette", f"pixels use indices {sorted(bad)} that are not in the palette")
    cols = [s.palette[v] for v in sorted(used) if 0 < v < len(s.palette)]
    stats["colors_used"] = len(cols)
    if cols:
        ls = sorted(lum(c) for c in cols)
        if ls[-1] - ls[0] < 0.25 and len(cols) > 2:
            add("warn", "flat_values", "value range is narrow: the sprite will read flat. Add a darker shadow and a brighter highlight.")
        close = [(a, b) for i, a in enumerate(cols) for b in cols[i + 1:]
                 if sum((x - y) ** 2 for x, y in zip(rgb(a), rgb(b))) < 200]
        if close:
            add("info", "near_duplicates", f"{len(close)} pair(s) of almost identical colors (e.g. {close[0][0]} / {close[0][1]}); merge them for a cleaner palette.")
        if len(cols) > 24 and s.w <= 32:
            add("info", "many_colors", f"{len(cols)} colors on a {s.w}x{s.h} sprite; small sprites read better with 8-16.")
        # contrast of the outline against the game background
        bg = s.d["meta"].get("bg", "#2b2f3a")
        outs = [f.get("outline") for f in stats["frames"] if f.get("outline")]
        if outs:
            o = max(set(outs), key=outs.count)
            if o < len(s.palette):
                l1, l2 = sorted((lum(s.palette[o]), lum(bg)))
                ratio = (l2 + 0.05) / (l1 + 0.05)
                stats["outline_vs_bg_contrast"] = round(ratio, 2)
                if ratio < 1.6:
                    add("warn", "low_contrast", f"outline {s.palette[o]} vs background {bg} contrast {ratio:.2f}:1; the silhouette may vanish in game. Darken/lighten the outline or use selective outline.")
    score = max(0, 100 - sum({"error": 25, "warn": 8, "info": 2}[i["level"]] for i in issues))
    return {"score": score, "issues": issues, "stats": stats}


def summary(res: dict) -> str:
    lines = [f"Lint score {res['score']}/100 · colors used {res['stats'].get('colors_used', 0)}"]
    for i in res["issues"]:
        f = f" [frame {i['frame']}]" if "frame" in i else ""
        at = f" at {i['at'][:6]}" if i.get("at") else ""
        lines.append(f"- {i['level'].upper()} {i['code']}{f}: {i['msg']}{at}")
    if not res["issues"]:
        lines.append("- no issues found")
    return "\n".join(lines)
