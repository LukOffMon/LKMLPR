"""Arma prospectos/data.js con los lugares de mundo.json (prospectos de Rojo 87, sin teléfono).

Los teléfonos se buscan en Google Maps desde el panel y se guardan en el navegador.
Los prospectos de menus-qr NO entran aquí: son otro negocio.
Uso (desde LKMLPR):  python rojo87/prospectos/_build.py
"""
import json, re, unicodedata
from pathlib import Path

HERE = Path(__file__).parent


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:48]


mundo = json.loads((HERE / "mundo.json").read_text(encoding="utf-8"))
out = [{"id": p["pais"].lower() + "-" + slug(p["lugar"] + "-" + p["ciudad"]), "lugar": p["lugar"], "ciudad": p["ciudad"],
        "pais": p["pais"], "giro": p["giro"], "tel": ""} for p in mundo["lugares"]]

ids = set()
for p in out:
    while p["id"] in ids:
        p["id"] += "-2"
    ids.add(p["id"])

js = ("// Generado por _build.py desde mundo.json. No editar a mano.\n"
      "window.PROSPECTOS = " + json.dumps(out, ensure_ascii=False, indent=0) + ";\n")
(HERE / "data.js").write_text(js, encoding="utf-8")
print(len(out), "prospectos:", {k: sum(1 for p in out if p["pais"] == k) for k in sorted({p["pais"] for p in out})})
