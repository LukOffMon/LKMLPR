# LKMLPR

- `maletin/` — **Maletín**: app de planificación para generar riqueza desde cero (React + Vite). Ver `maletin/README.md`.
- `lkmr/` — **Sitio de LKM'r Company**: one-page autocontenido listo para publicar. Ver `lkmr/README.md`.
- `mensajes/` — **Macro de ventas de menús QR** (con PIN): herramienta para socios. Al entrar muestra un **tutorial de inicio** (la primera vez) y un **aviso de nuevos posibles clientes** (🔔, primero los que tienen WhatsApp). Tiene "Hoy te toca" (qué hacer en un toque), primeros pasos para socios nuevos, buscador, filtro "Solo con WhatsApp", el **estándar de excelencia** por menú, respuestas rápidas, kit de cierre, notas, mapa con rutas, protección del número contra sanciones de WhatsApp y avance compartido en Supabase. Los prospectos (`PRESETS`) los genera `WebDesignLKM/menus-qr/_tools/macro.py`; los que se publiquen después llegan solos desde `menus-qr/macro.json`. Abajo sigue el generador de mensajes sueltos. Funciona como app: una vista a la vez (Hoy · Prospectos · Pagos · Mapa · Más) con barra inferior en el celular, Ajustes en un solo lugar, respaldo de datos locales, instalable en la pantalla de inicio (sirve sin internet con la última versión) y atajos de teclado. Prueba automática: `node tests/mensajes.smoke.cjs` (requiere Playwright); corre sola en los PRs que tocan `mensajes/`.
- `highlyartmon/` — **HighlyArtMon**: estudio de pixel art local conectado a Claude (MCP): Claude dibuja, ve el render y tú lo ves en vivo; exporta a GameMaker. Ver `highlyartmon/app/README.md`. Tests: `python -m unittest discover -s highlyartmon/app/tests`.
- `rojo87/` — **Rojo 87**: la luz roja de tu restaurante. Una sola app para restaurantes, bares y cafés que une reservas, carta, pedido desde la mesa, cocina en orden, la "luz roja" para llamar al mesero y el regreso del cliente. Sin aparatos y con 0 % de comisión; primer mes a $1. El sitio está en 4 idiomas (ES · EN · 中文 · FR; también con `?lang=`) y no necesita compilación: `index.html` + `styles.css` + `i18n.js` (textos) + `app.js` (GSAP, ScrollTrigger y Lenis por CDN). Los precios están en `PRICES` y el contacto en `CONFIG` dentro de `app.js`. Plan de negocio completo en [`rojo87/PLAN_MAESTRO.md`](rojo87/PLAN_MAESTRO.md). Para verlo local: `python -m http.server --directory rojo87`.
- `candyos/`, `encuesta/`, `nexus/` — otros proyectos.

## Publicación (GitHub Pages)

Cada push a `main` compila y publica con `.github/workflows/pages.yml`:

- https://lukoffmon.github.io/LKMLPR/ — sitio de LKM'r Company
- https://lukoffmon.github.io/LKMLPR/maletin/ — app Maletín
- https://lukoffmon.github.io/LKMLPR/mensajes/ — herramienta de mensajes de WhatsApp
- https://lukoffmon.github.io/LKMLPR/highlyartmon/ — HighlyArtMon (sitio + instalador; editor en el navegador en `/highlyartmon/app/`)
- https://lukoffmon.github.io/LKMLPR/rojo87/ — Rojo 87 (sitio de venta en 4 idiomas)
- `/candyos/`, `/encuesta/`, `/nexus/` — otros proyectos (se copian tal cual)

Requisito (una sola vez): Settings → Pages → Source: **GitHub Actions**.
