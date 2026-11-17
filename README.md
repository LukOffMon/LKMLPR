# LKMLPR

- `maletin/` — **Maletín**: app de planificación para generar riqueza desde cero (React + Vite). Ver `maletin/README.md`.
- `lkmr/` — **Sitio de LKM'r Company**: one-page autocontenido listo para publicar. Ver `lkmr/README.md`.
- `mensajes/` — **Mensajes de WhatsApp**: herramienta interna para vender menús QR. Pones número, nombre del lugar y (si ya existe) el enlace del menú; arma un mensaje distinto cada vez (primer mensaje, seguimiento o cierre) y lo abre en WhatsApp. Todo se guarda solo en el navegador. Arriba tiene un bloque temporal de "Envío rápido" (entre los comentarios `MACRO:START`/`MACRO:END` y `MACRO-JS:START`/`MACRO-JS:END`) con los 36 prospectos como casillas; se borra cuando termines de enviar.
- `candyos/`, `encuesta/`, `nexus/` — otros proyectos.

## Publicación (GitHub Pages)

Cada push a `main` compila y publica con `.github/workflows/pages.yml`:

- https://lukoffmon.github.io/LKMLPR/ — sitio de LKM'r Company
- https://lukoffmon.github.io/LKMLPR/maletin/ — app Maletín
- https://lukoffmon.github.io/LKMLPR/mensajes/ — herramienta de mensajes de WhatsApp
- `/candyos/`, `/encuesta/`, `/nexus/` — otros proyectos (se copian tal cual)

Requisito (una sola vez): Settings → Pages → Source: **GitHub Actions**.
