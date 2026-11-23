"""Exports for game engines. GameMaker auto-slices files named <sprite>_strip<N>.png on import."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from .model import Sprite
from .raster import Image, composite


def _strip(s: Sprite, frames, scale=1) -> Image:
    out = Image(s.w * len(frames), s.h)
    for i, fi in enumerate(frames):
        out.paste(composite(s, fi), i * s.w, 0)
    return out.scaled(scale)


def _gm_name(name: str) -> str:
    n = re.sub(r"[^A-Za-z0-9_]", "_", name)
    return n if n.startswith("spr_") else "spr_" + n


def export(s: Sprite, out_dir, fmt="gamemaker", scale=1, per_tag=True) -> dict:
    out = Path(out_dir).expanduser()
    out.mkdir(parents=True, exist_ok=True)
    scale = max(1, int(scale))
    base = _gm_name(s.d["name"])
    ox, oy = s.d["origin"]
    files = []
    groups = [(base, list(range(len(s.frames))))]
    if per_tag and s.d["tags"]:
        groups = [(f"{base}_{t['name']}", list(range(t["from"], t["to"] + 1))) for t in s.d["tags"]]

    def fps(frs):
        ms = sum(s.frames[i]["duration"] for i in frs) / len(frs)
        return round(1000 / ms, 2)

    if fmt in ("gamemaker", "strip"):
        gml = ["// HighlyArtMon export - load at runtime (or drag the PNGs into GameMaker: *_stripN.png auto-slices)"]
        for name, frs in groups:
            fn = f"{name}_strip{len(frs)}.png"
            (out / fn).write_bytes(_strip(s, frs, scale).png())
            files.append(fn)
            gml.append(f'{name} = sprite_add("{fn}", {len(frs)}, false, false, {ox * scale}, {oy * scale}); // {fps(frs)} fps')
        (out / f"{base}_load.gml").write_text("\n".join(gml) + "\n", encoding="utf-8")
        files.append(f"{base}_load.gml")
    elif fmt == "frames":
        for name, frs in groups:
            for k, fi in enumerate(frs):
                fn = f"{name}_{k}.png"
                (out / fn).write_bytes(composite(s, fi).scaled(scale).png())
                files.append(fn)
    elif fmt == "sheet":
        frs = list(range(len(s.frames)))
        fn = f"{base}_sheet.png"
        (out / fn).write_bytes(_strip(s, frs, scale).png())
        meta = {"frames": {f"{base} {i}.png": {"frame": {"x": i * s.w * scale, "y": 0, "w": s.w * scale, "h": s.h * scale},
                                                "duration": s.frames[i]["duration"]} for i in frs},
                "meta": {"app": "HighlyArtMon", "image": fn, "size": {"w": s.w * len(frs) * scale, "h": s.h * scale}, "scale": str(scale),
                         "frameTags": [{"name": t["name"], "from": t["from"], "to": t["to"], "direction": "forward"} for t in s.d["tags"]],
                         "pivot": {"x": ox, "y": oy}}}
        (out / f"{base}_sheet.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
        files += [fn, f"{base}_sheet.json"]
    elif fmt == "layers":
        for li, L in enumerate(s.layers):
            img = Image(s.w * len(s.frames), s.h)
            from .raster import cel_image
            for fi in range(len(s.frames)):
                img.paste(cel_image(s, s.cel(li, fi, create=False)), fi * s.w, 0)
            fn = f"{base}_{re.sub(r'[^A-Za-z0-9_]', '_', L['name'])}_strip{len(s.frames)}.png"
            (out / fn).write_bytes(img.scaled(scale).png())
            files.append(fn)
    else:
        raise ValueError("format: gamemaker, frames, sheet or layers")
    return {"dir": str(out), "files": files, "origin": [ox * scale, oy * scale]}


def default_export_dir(name: str) -> str:
    from . import paths
    return os.path.join(str(paths.projects_dir()), "exports", name)
