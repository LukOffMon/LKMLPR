# Instrucciones para Claude en la laptop (Liquid SKd)

Esta carpeta convierte esta laptop en el servidor de Liquid SKd (Soulseek + puente + Tailscale Funnel). Sigue `PROTOCOLO.md`.

- Comprueba primero `uname -m` (debe ser x86_64 o aarch64), RAM y disco.

## Antes de instalar: analizar y limpiar la laptop (sin reinstalar)

La persona no va a reinstalar el sistema; quiere quitar la basura. Haz primero un análisis y enséñale un resumen (sistema, versión, espacio, memoria, lo que más ocupa) antes de borrar nada.

- **Análisis:** `cat /etc/os-release`, `uname -m`, `free -h`, `df -h /`, `du -xh / --max-depth=2 2>/dev/null | sort -h | tail -25`, `du -sh ~/* ~/.cache 2>/dev/null | sort -h | tail -15`, paquetes y servicios que no pinten nada en un servidor (`systemctl list-units --type=service --state=running`).
- **Si el sistema es Ubuntu 20.04 o anterior (o Debian 10 o anterior)**, avísale: Docker y slskd pueden no funcionar bien; lo ideal sería reinstalar o actualizar la versión. Que decida la persona.
- **Basura que puedes borrar sin preguntar** (no son datos de nadie):
  - `sudo apt-get update && sudo apt-get full-upgrade -y`
  - `sudo apt-get autoremove --purge -y && sudo apt-get clean` (paquetes huérfanos, kernels viejos, caché de apt)
  - `sudo journalctl --vacuum-time=7d` (logs del sistema antiguos)
  - `rm -rf ~/.cache/*` y la papelera `~/.local/share/Trash/*`
  - `/tmp` y `/var/tmp` (archivos de más de 7 días)
  - Snaps viejos deshabilitados: `snap list --all | awk '/disabled/{print $1, $3}'` y `sudo snap remove <nombre> --revision=<rev>`
- **Lo que NO borras sin preguntar:** cualquier cosa en `~/Documentos`, `~/Descargas`, `~/Imágenes`, `~/Música`, `~/Vídeos`, `~/Escritorio` u otras carpetas personales, y programas instalados a mano. Enséñale la lista de lo que más ocupa y pregunta qué se va.
- **Opcional, si la persona quiere:** quitar programas de escritorio que un servidor no necesita (juegos, LibreOffice, etc.), siempre preguntando antes.
- Al final, enséñale el espacio libre antes y después, y sigue con `PROTOCOLO.md` (paso 3 en adelante).
- La instalación es `bash instalar.sh`: pide la contraseña de Linux (sudo), la clave de Tailscale y la cuenta de Soulseek. Esas tres cosas las escribe la persona en la terminal; no las pidas por el chat ni las escribas en archivos que no sean `.env` y `slskd/slskd.yml`.
- Nunca subas `.env`, `slskd/`, `musica/`, `datos/` ni `tailscale-estado/` al repositorio, ni muestres la clave `LIQUID_CLAVE` en el chat salvo que la persona la pida.
- Para comprobar: `docker compose ps`, `docker compose logs --tail 60 <servicio>` y `curl -s https://<dirección>/salud`.
- Si slskd responde distinto de lo que espera el puente (`puente/server.mjs`), los tests están en `puente/server.test.mjs` (`node --test puente/`).
