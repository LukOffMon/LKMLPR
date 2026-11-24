"""Arma prospectos/data.js con mundo.json + contactos.json.

- mundo.json: los lugares (nombre, ciudad, país, giro).
- contactos.json: teléfono oficial encontrado en fuentes públicas (sitio del lugar, guías
  Michelin / 50 Best / AAA / turismo oficial, prensa), con la fuente, la confianza
  (alta / media / baja), si es WhatsApp confirmado y un número alterno. Se llena con _add.py.
  Los marcados "quitar" (cerrados, duplicados o que no existen) no entran.

Los prospectos de menus-qr NO entran aquí: son otro negocio.
Uso (desde LKMLPR):  python rojo87/prospectos/_build.py
"""
import json, re, unicodedata
from pathlib import Path

HERE = Path(__file__).parent


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:48]


mundo = json.loads((HERE / "mundo.json").read_text(encoding="utf-8"))["lugares"]
contactos = json.loads((HERE / "contactos.json").read_text(encoding="utf-8"))

out, quitados = [], []
for i, p in enumerate(mundo):
    c = contactos.get(str(i), {})
    if c.get("quitar"):
        quitados.append(f"{p['lugar']} ({p['ciudad']}): {c.get('nota', '')}")
        continue
    lugar = c.get("renombrar") or p["lugar"]
    out.append({
        "id": p["pais"].lower() + "-" + slug(lugar + "-" + p["ciudad"]),
        "lugar": lugar, "ciudad": p["ciudad"], "pais": p["pais"], "giro": p["giro"],
        "tel": c.get("tel", ""), "wa": bool(c.get("wa")), "alt": c.get("alt", ""),
        "fuente": c.get("fuente", ""), "conf": c.get("conf", ""), "nota": c.get("nota", ""),
    })

ids = set()
for p in out:
    while p["id"] in ids:
        p["id"] += "-2"
    ids.add(p["id"])

js = ("// Generado por _build.py desde mundo.json + contactos.json. No editar a mano.\n"
      "window.PROSPECTOS = " + json.dumps(out, ensure_ascii=False, indent=0) + ";\n")
(HERE / "data.js").write_text(js, encoding="utf-8")
con = sum(1 for p in out if p["tel"])
print(f"{len(out)} prospectos, {con} con teléfono, {sum(p['wa'] for p in out)} WhatsApp confirmado")
print("quitados:", *quitados, sep="\n  ")
