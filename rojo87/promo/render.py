"""Renderiza el tráiler de Rojo 87 a MP4 (1080x1920, 30 fps) con voz y música.

  python render.py               → rojo87-trailer-60s.mp4
  python render.py --stills 3 12  → build/still_3.0.jpg, build/still_12.0.jpg

Antes: python voz.py && python musica.py. Usa Microsoft Edge vía Playwright y ffmpeg.
"""
import functools, http.server, json, socketserver, subprocess, sys, threading
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
B = HERE / "build"
FPS = 30
OUT = HERE / "rojo87-trailer-60s.mp4"


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(HERE))
    handler.log_message = lambda *a: None
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def audio_filter(tiempos):
    """Voz por escena con su retraso + música que baja cuando hay voz."""
    parts, labels = [], []
    for i, s in enumerate(tiempos["scenes"]):
        ms = int(s["start"] * 1000)
        parts.append(f"[{i + 2}:a]adelay={ms}|{ms},aformat=channel_layouts=stereo[v{i}]")
        labels.append(f"[v{i}]")
    n = len(labels)
    parts.append(f"{''.join(labels)}amix=inputs={n}:normalize=0,volume=1.6,asplit=2[vo][sc]")
    parts.append("[1:a]volume=0.55[mu]")
    parts.append("[mu][sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[duck]")
    parts.append("[vo][duck]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:60[aout]")
    return ";".join(parts)


def main():
    tiempos = json.loads((B / "tiempos.json").read_text(encoding="utf-8"))
    httpd = serve()
    url = f"http://127.0.0.1:{httpd.server_address[1]}/trailer.html"
    stills = [float(x) for x in sys.argv[sys.argv.index("--stills") + 1:]] if "--stills" in sys.argv else None

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
        page.goto(url)
        page.wait_for_function("window.ready === true", timeout=60000)
        page.wait_for_timeout(500)

        if stills:
            for t in stills:
                page.evaluate(f"seekTo({t})")
                page.screenshot(path=str(B / f"still_{t}.jpg"), type="jpeg", quality=85)
            browser.close()
            print("stills ok")
            return

        total = page.evaluate("window.TOTAL")
        frames = int(round(total * FPS))
        voices = [str(B / f"{s['id']}.mp3") for s in tiempos["scenes"]]
        cmd = ["ffmpeg", "-y", "-v", "error",
               "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
               "-i", str(B / "musica.wav")]
        for v in voices:
            cmd += ["-i", v]
        cmd += ["-filter_complex", audio_filter(tiempos), "-map", "0:v", "-map", "[aout]",
                "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{total:.3f}", str(OUT)]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for i in range(frames):
            page.evaluate(f"seekTo({i / FPS})")
            ff.stdin.write(page.screenshot(type="jpeg", quality=93))
            if i % 150 == 0:
                print(f"{i}/{frames}", flush=True)
        ff.stdin.close()
        ff.wait()
        browser.close()
    httpd.shutdown()
    print("listo:", OUT)


if __name__ == "__main__":
    main()
