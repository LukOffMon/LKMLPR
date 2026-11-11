# Instrucciones para Claude en la laptop (Liquid SKd)

Esta carpeta convierte esta laptop en el servidor de Liquid SKd (Soulseek + puente + Tailscale Funnel). Sigue `PROTOCOLO.md`.

- Comprueba primero `uname -m` (debe ser x86_64 o aarch64), RAM y disco.
- La instalación es `bash instalar.sh`: pide la contraseña de Linux (sudo), la clave de Tailscale y la cuenta de Soulseek. Esas tres cosas las escribe la persona en la terminal; no las pidas por el chat ni las escribas en archivos que no sean `.env` y `slskd/slskd.yml`.
- Nunca subas `.env`, `slskd/`, `musica/`, `datos/` ni `tailscale-estado/` al repositorio, ni muestres la clave `LIQUID_CLAVE` en el chat salvo que la persona la pida.
- Para comprobar: `docker compose ps`, `docker compose logs --tail 60 <servicio>` y `curl -s https://<dirección>/salud`.
- Si slskd responde distinto de lo que espera el puente (`puente/server.mjs`), los tests están en `puente/server.test.mjs` (`node --test puente/`).
