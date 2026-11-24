# LKMLPR

- `maletin/` — **Maletín**: app de planificación para generar riqueza desde cero (React + Vite). Ver `maletin/README.md`.
- `lkmr/` — **Sitio de LKM'r Company**: one-page autocontenido listo para publicar. Ver `lkmr/README.md`.
- `mensajes/` — **Macro de ventas de menús QR** (con PIN): herramienta para socios. Al entrar muestra un **tutorial de inicio** (la primera vez) y un **aviso de nuevos posibles clientes** (🔔, primero los que tienen WhatsApp). Tiene "Hoy te toca" (qué hacer en un toque), primeros pasos para socios nuevos, buscador, filtro "Solo con WhatsApp", el **estándar de excelencia** por menú, respuestas rápidas, kit de cierre, notas, mapa con rutas, protección del número contra sanciones de WhatsApp y avance compartido en Supabase. Los prospectos (`PRESETS`) los genera `WebDesignLKM/menus-qr/_tools/macro.py`; los que se publiquen después llegan solos desde `menus-qr/macro.json`. Abajo sigue el generador de mensajes sueltos. Funciona como app: una vista a la vez (Hoy · Prospectos · Pagos · Mapa · Más) con barra inferior en el celular, Ajustes en un solo lugar, respaldo de datos locales, instalable en la pantalla de inicio (sirve sin internet con la última versión) y atajos de teclado. Prueba automática: `node tests/mensajes.smoke.cjs` (requiere Playwright); corre sola en los PRs que tocan `mensajes/`.
- `highlyartmon/` — **HighlyArtMon**: estudio de pixel art local conectado a Claude (MCP): Claude dibuja, ve el render y tú lo ves en vivo; exporta a GameMaker. Ver `highlyartmon/app/README.md`. Tests: `python -m unittest discover -s highlyartmon/app/tests`.
- `rojo87/` — **Rojo 87**: la luz roja de tu restaurante. Una sola app para restaurantes, bares y cafés: reservas, carta, pedido desde la mesa, cocina en orden, la "luz roja" para llamar al mesero y el regreso del cliente. Sin aparatos y con 0 % de comisión; primer mes a $1 USD / $20 MXN. Plan de negocio completo en [`rojo87/PLAN_MAESTRO.md`](rojo87/PLAN_MAESTRO.md).
  - Sitio de venta en 4 idiomas (ES · EN · 中文 · FR; también con `?lang=`), sin compilación: `index.html` + `styles.css` + `i18n.js` (textos) + `app.js` (GSAP, ScrollTrigger y Lenis por CDN). Precios en `PRICES` y contacto en `CONFIG` dentro de `app.js`. Local: `python -m http.server --directory rojo87`.
  - `lealtad/` — cuenta del restaurante y **tarjetas de lealtad** (antes Mr Key): panel del dueño, QR del mostrador, sellado del equipo, tarjeta del cliente (web, Apple y Google Wallet), campañas y métricas. `llave-maestra.html` (oculta) es el panel de **licencias y pagos**: aprobar cuentas, registrar el pago del primer mes o del plan, renovar y cancelar. Pruebas: `node rojo87/lealtad/pruebas/e2e.js capturas` con `python -m http.server 8000` en la raíz (requiere Playwright; `PW_CHANNEL=msedge` para usar Edge).
  - `supabase/` — API (Edge Function `rojo87`) y migraciones; tablas `r87_*`. La migración `20261123000000_rojo87_desde_mrkey.sql` renombra las tablas `mk_*` de Mr Key. Desplegar: `supabase db push` y `supabase functions deploy rojo87 --project-ref lsvyryanshcuysowlysp --no-verify-jwt`.
  - `prospectos/` — panel privado (con PIN, `noindex`) de restaurantes por país con invitación por WhatsApp sin enlaces y un segundo mensaje con el sitio y el QR de la prueba de $20. La lista sale de `prospectos/mundo.json` (`python rojo87/prospectos/_build.py`); teléfonos, estados y notas se guardan en el navegador (con respaldo en JSON).
  - `promo/` — tráiler vertical de 60 s con voz y música (`rojo87-trailer-60s.mp4`) y su estrategia en `promo/MARKETING.md`. Se regenera con `voz.py`, `musica.py` y `render.py`.
- `candyos/`, `encuesta/`, `nexus/` — otros proyectos.

## Publicación (GitHub Pages)

Cada push a `main` compila y publica con `.github/workflows/pages.yml`:

- https://lukoffmon.github.io/LKMLPR/ — sitio de LKM'r Company
- https://lukoffmon.github.io/LKMLPR/maletin/ — app Maletín
- https://lukoffmon.github.io/LKMLPR/mensajes/ — herramienta de mensajes de WhatsApp
- https://lukoffmon.github.io/LKMLPR/highlyartmon/ — HighlyArtMon (sitio + instalador; editor en el navegador en `/highlyartmon/app/`)
- https://lukoffmon.github.io/LKMLPR/rojo87/ — Rojo 87 (sitio de venta en 4 idiomas)
- https://lukoffmon.github.io/LKMLPR/rojo87/lealtad/ — Rojo 87 · cuenta del restaurante y lealtad (`panel.html`, `sellar.html`, `llave-maestra.html`)
- https://lukoffmon.github.io/LKMLPR/rojo87/prospectos/ — Rojo 87 · prospectos (privado, con PIN)
- `/candyos/`, `/encuesta/`, `/nexus/` — otros proyectos (se copian tal cual)

Requisito (una sola vez): Settings → Pages → Source: **GitHub Actions**.
