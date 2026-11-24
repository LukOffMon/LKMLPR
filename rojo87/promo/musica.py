"""Música y efectos del tráiler, sintetizados (sin samples ni derechos de terceros).

Lee build/tiempos.json, escribe build/cues.json (momentos que también usa la animación)
y build/musica.wav (estéreo 44.1 kHz). Uso: python musica.py
"""
import json, wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
B = HERE / "build"
SR = 44100
BPM = 100
BEAT = 60 / BPM
rng = np.random.default_rng(87)

T = json.loads((B / "tiempos.json").read_text(encoding="utf-8"))
S = {s["id"]: s for s in T["scenes"]}
TOTAL = 60.0
N = int(TOTAL * SR)
L = np.zeros(N)
R = np.zeros(N)


def word(sid, w, nth=0):
    hits = [x for x in S[sid]["words"] if x["w"].lower().strip(".,") == w.lower()]
    return S[sid]["start"] + hits[nth]["t"]


# ── Cues compartidos con la animación ─────────────────────────────
s2 = S["s2"]["start"]
first = [(4, word("s2", "cuatro")), (7, word("s2", "siete")), (12, word("s2", "doce"))]
rest_tables = [1, 9, 3, 11, 6, 2, 10, 5, 8]
t0, t1 = word("s2", "ronda") + 0.35, word("s2", "mesas") - 0.1
lights = first + [(n, t0 + i * (t1 - t0) / (len(rest_tables) - 1)) for i, n in enumerate(rest_tables)]
cues = {
    "lights": [{"table": n, "t": round(t, 3)} for n, t in lights],
    "flash": S["s3"]["start"],
    "si": word("s3", "sí"),
    "logo": S["s4"]["start"] + 0.5,
    "tap": word("s5", "toque") - 0.15,
    "callTap": word("s5", "Llama"),
    "billTap": word("s5", "cuenta"),
    "staffSees": word("s5", "equipo"),
    "tickets": [S["s6"]["start"] + 0.3 + i * 0.55 for i in range(4)],
    "soldout": word("s6", "acabó"),
    "chat": [word("s7", "escriben") - 0.2, word("s7", "medianoche") + 0.5, word("s7", "apartada")],
    "slams": [word("s8", "Sin", 0), word("s8", "Sin", 1), word("s8", "Cero")],
    "dollar": word("s9", "dólar"),
    "price": S["s9"]["start"],
    "end": S["s10"]["start"],
    "enciende": word("s10", "Enciende"),
    "total": TOTAL,
}
(B / "cues.json").write_text(json.dumps(cues, indent=1), encoding="utf-8")


# ── Instrumentos ─────────────────────────────────────────────────
def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
    R[i:i + len(sig)] += sig * gain * (1 + min(0, pan))


def env(n, a=0.005, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def kick(dur=0.45):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.18)


def noise(n):
    return rng.standard_normal(n)


def hp(x, a=0.95):  # paso alto de un polo
    y = np.zeros_like(x); p = 0.0; px = 0.0
    for i, v in enumerate(x):
        p = a * (p + v - px); px = v; y[i] = p
    return y


def lp(x, a):  # paso bajo de un polo (vectorizado a trozos con lfilter manual)
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc); y[i] = acc
    return y


HAT = hp(noise(int(0.04 * SR))) * env(int(0.04 * SR), 0.001, 0.012)
CLAP = hp(noise(int(0.18 * SR)), 0.8) * env(int(0.18 * SR), 0.002, 0.05)
KICK = kick()


def ping(freqs=(1318.5, 1975.5), dur=0.9):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) / (k + 1) for k, f in enumerate(freqs))
    return s * env(n, 0.002, 0.22)


def impact(dur=2.6):
    n = int(dur * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(32 + 80 * np.exp(-t / 0.08)) / SR) * env(n, 0.002, 0.7)
    tail = lp(noise(n), 0.08) * env(n, 0.003, 0.9) * 2.5
    return boom + tail * 0.5


def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / dur) ** 2) / SR)
    return (sweep * 0.35 + hp(noise(n), 0.9) * 0.25) * (t / dur) ** 2.2


def note(freq, dur, wave_="saw", d=None):
    n = int(dur * SR); t = np.arange(n) / SR
    if wave_ == "saw":
        s = 2 * ((t * freq) % 1) - 1
    else:
        s = np.sin(2 * np.pi * freq * t)
    return s * env(n, 0.01, d or dur)


# Acordes Dm – Bb – F – C (raíces)
ROOTS = [73.42, 58.27, 87.31, 65.41]
CHORDS = [[146.83, 174.61, 220.0], [116.54, 146.83, 174.61], [174.61, 220.0, 261.63], [130.81, 164.81, 196.0]]


def pad(t_start, t_end, gain):
    t = t_start; i = 0
    while t < t_end:
        dur = min(4 * BEAT, t_end - t)
        n = int(dur * SR); tt = np.arange(n) / SR
        s = sum(np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.003 * tt) for f in CHORDS[i % 4])
        s *= np.minimum(1, tt / 0.4) * np.minimum(1, (dur - tt) / 0.4)
        add(s, t, gain * 0.06, pan=(-0.3 if i % 2 else 0.3))
        t += 4 * BEAT; i += 1


def groove(t_start, t_end, full=True):
    t = t_start; k = 0
    while t < t_end - 0.01:
        bar = int(k // 4)
        add(KICK, t, 0.9)
        if full and k % 4 in (1, 3):
            add(CLAP, t, 0.35, pan=0.1)
        for h in range(4 if full else 2):
            add(HAT, t + h * BEAT / (4 if full else 2), 0.10 if h % 2 else 0.05, pan=-0.4)
        root = ROOTS[bar % 4]
        for e in range(2):
            add(lp(note(root, BEAT / 2 * 0.95), 0.12), t + e * BEAT / 2, 0.55)
        t += BEAT; k += 1


# ── Arreglo ─────────────────────────────────────────────────────
pad(0.0, cues["flash"], 0.7)
# latido antes del impacto
t = 1.2
while t < cues["flash"] - 0.2:
    add(KICK, t, 0.45)
    if t > S["s2"]["start"]:
        add(HAT, t + BEAT / 2, 0.05, pan=0.4)
    t += BEAT
for c in cues["lights"]:
    add(ping(), c["t"], 0.22, pan=((c["table"] % 3) - 1) * 0.5)
add(riser(cues["flash"] - S["s2"]["start"] - 6.0), S["s2"]["start"] + 6.0, 0.6)
add(impact(), cues["flash"], 0.9)
pad(cues["flash"], cues["logo"], 0.9)
add(impact(1.8), cues["logo"], 0.6)
groove(cues["logo"], cues["price"] - 0.1)
pad(cues["logo"], cues["price"], 0.6)
add(ping((880, 1318.5), 0.7), cues["tap"], 0.25)
for tk in cues["tickets"]:
    add(ping((660, 990), 0.4), tk, 0.12, pan=0.3)
add(CLAP, cues["soldout"], 0.6)
for c in cues["chat"]:
    add(ping((1046.5, 1568), 0.5), c, 0.15, pan=-0.3)
for s in cues["slams"]:
    add(impact(0.8), s, 0.45)
add(riser(cues["dollar"] - cues["price"] + 0.05), cues["price"], 0.55)
add(impact(), cues["dollar"], 0.85)
pad(cues["end"], TOTAL, 0.8)
groove(cues["end"], cues["enciende"], full=False)
add(impact(3.5), cues["enciende"], 0.8)

# ── Master ──────────────────────────────────────────────────────
fade = int(1.6 * SR)
for ch in (L, R):
    ch[-fade:] *= np.linspace(1, 0, fade)
peak = max(np.abs(L).max(), np.abs(R).max())
st = (np.stack([L, R], axis=1) / peak * 0.85 * 32767).astype(np.int16)
with wave.open(str(B / "musica.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print("ok", json.dumps({k: v for k, v in cues.items() if k != "lights"}))
