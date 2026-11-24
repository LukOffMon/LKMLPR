"""Genera la voz del tráiler por escena y escribe build/tiempos.json.

Para cada escena guarda cuándo empieza, cuánto dura la voz y en qué segundo
se dice cada palabra (para sincronizar luces y textos).

Uso: python voz.py   (desde rojo87/promo). Requiere edge-tts y ffprobe.
"""
import asyncio, json, subprocess
from pathlib import Path

import edge_tts

HERE = Path(__file__).parent
OUT = HERE / "build"
LEAD_IN = 0.6  # respiro antes de la primera palabra


def duration(path: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


async def synth(text: str, voice: str, rate: str, pitch: str, mp3: Path) -> list:
    words = []
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    with mp3.open("wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"w": chunk["text"], "t": round(chunk["offset"] / 1e7, 3)})
    return words


async def main() -> None:
    g = json.loads((HERE / "guion.json").read_text(encoding="utf-8-sig"))
    OUT.mkdir(exist_ok=True)
    t = LEAD_IN
    scenes = []
    for s in g["scenes"]:
        mp3 = OUT / f"{s['id']}.mp3"
        words = await synth(s["vo"], g["voice"], g["rate"], g["pitch"], mp3)
        d = duration(mp3)
        scenes.append({"id": s["id"], "vo": s["vo"], "start": round(t, 3), "voice": round(d, 3),
                       "end": round(t + d + s["pad"], 3), "words": words})
        t += d + s["pad"]
    data = {"total": round(t, 3), "scenes": scenes}
    (OUT / "tiempos.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    for s in scenes:
        print(s["id"], s["start"], s["end"], " ".join(f"{w['w']}@{w['t']}" for w in s["words"]))
    print("total", data["total"])


asyncio.run(main())
