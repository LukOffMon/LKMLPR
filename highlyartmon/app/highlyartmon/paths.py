"""Where HighlyArtMon keeps things. Projects: ~/HighlyArtMon (visible). State: ~/.highlyartmon."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path


def home() -> Path:
    return Path(os.environ.get("HIGHLYARTMON_HOME") or Path.home())


def projects_dir() -> Path:
    p = Path(os.environ.get("HIGHLYARTMON_PROJECTS") or home() / "HighlyArtMon")
    p.mkdir(parents=True, exist_ok=True)
    return p


def state_dir() -> Path:
    p = home() / ".highlyartmon"
    p.mkdir(parents=True, exist_ok=True)
    return p


def running_file() -> Path:
    return state_dir() / "running.json"


def read_json(p: Path, default):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(p: Path, data) -> None:
    import time
    tmp = Path(f"{p}.{os.getpid()}.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    for attempt in range(40):  # Windows refuses to replace a file another thread is reading
        try:
            os.replace(tmp, p)
            break
        except PermissionError:
            if attempt == 39:
                raise
            time.sleep(0.025)
    try:
        os.chmod(p, 0o600)
    except OSError:
        pass


def self_command(*args: str, console: bool = True) -> list:
    exe = sys.executable
    if not console and sys.platform == "win32":
        w = Path(exe).with_name("pythonw.exe")
        if w.exists():
            exe = str(w)
    return [exe, "-m", "highlyartmon", *args]
