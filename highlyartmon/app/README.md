# HighlyArtMon

Estudio de pixel art que corre en tu PC y se conecta a Claude. Claude dibuja con operaciones precisas, **ve** cada resultado como imagen y tú lo ves en vivo en el editor (y al revés: lo que pintas, Claude lo lee).

- Editor: lápiz pixel-perfect, borrador, línea, rectángulo, elipse, relleno, cuentagotas, selección/mover, tramado, sombreado por rampas, simetría X/Y, capas con opacidad, frames con duración, tags de animación, piel de cebolla, silueta, mosaico 3×3, guías isométricas, vista previa animada, vista 2.5D *sprite stacking*, deshacer/rehacer, importar PNG (detecta el escalado y reduce colores).
- Revisión automática: píxeles huérfanos, contornos dobles, esquinas en L, deriva entre frames, rango de valores plano, colores casi repetidos, contraste del contorno con el fondo del juego.
- Exportación: GameMaker (`spr_x_<tag>_stripN.png`, que GameMaker corta solo, más un `.gml` con `sprite_add` y el origen), PNG por frame, hoja + JSON estilo Aseprite, tira por capa.
- Claude (MCP): `ham_guide`, `ham_status`, `ham_new`, `ham_read`, `ham_edit`, `ham_view`, `ham_lint`, `ham_export`, `ham_import_png`, `ham_focus`, `ham_say`.

## Instalar

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/LukOffMon/LKMLPR/main/highlyartmon/install.ps1 | iex
```

macOS / Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/LukOffMon/LKMLPR/main/highlyartmon/install.sh | sh
```

El instalador usa Python 3.9+ (sin dependencias), crea accesos directos, ejecuta `highlyartmon connect` (registra el servidor MCP en Claude Code para todos tus proyectos, instala la skill y, si existe, lo añade a Claude Desktop) y abre la app.

Conexión manual en cualquier cliente MCP:

```json
{"mcpServers": {"highlyartmon": {"command": "python", "args": ["-m", "highlyartmon", "mcp"]}}}
```

## Uso

- `highlyartmon` abre la app (o la ventana si ya corre). Los sprites viven en `~/HighlyArtMon/*.ham.json`.
- `highlyartmon connect` / `disconnect`, `highlyartmon render <nombre> --mode review`.
- Pídele a Claude: *"diseña con HighlyArtMon un caballero de 32×32 con idle de 4 frames y expórtalo a mi proyecto de GameMaker"*.

Seguridad: el servidor solo escucha en `127.0.0.1`, comprueba el `Host` y exige un token aleatorio por ejecución (lo lee el puente MCP desde `~/.highlyartmon/running.json`).

## Desarrollo

```sh
python -m unittest discover -s tests
PYTHONPATH=. python -m highlyartmon serve --window
```
