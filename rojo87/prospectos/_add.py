"""Agrega resultados de la búsqueda de teléfonos a contactos.json.

Uso: python _add.py '<json>'   con una lista de objetos:
  {"i": índice en mundo.json, "tel": "+52...", "wa": true|false, "alt": "+52..." opcional,
   "fuente": "url", "conf": "alta"|"media"|"baja", "nota": "..."}
"""
import json, sys
from pathlib import Path

F = Path(__file__).parent / "contactos.json"
data = json.loads(F.read_text(encoding="utf-8")) if F.exists() else {}
for r in json.loads(sys.argv[1]):
    data[str(r.pop("i"))] = r
F.write_text(json.dumps(dict(sorted(data.items(), key=lambda kv: int(kv[0]))), ensure_ascii=False, indent=1), encoding="utf-8")
print(len(data), "registros")
