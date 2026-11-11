#!/usr/bin/env bash
# Protocolo Liquid SKd para la laptop de casa (Linux de 64 bits).
# Uso, dentro de esta carpeta:   bash instalar.sh
# Se puede repetir: no borra tu música ni cambia tus claves.
set -euo pipefail
cd "$(dirname "$0")"
echo "== Liquid SKd en la laptop =="

# 0. ¿Sirve esta máquina? (slskd solo existe para 64 bits)
ARQ=$(uname -m)
case "$ARQ" in
  x86_64|aarch64|arm64) echo "· Arquitectura $ARQ: sirve" ;;
  *) echo "✗ Esta máquina es $ARQ (32 bits): slskd no funciona aquí. Hace falta una de 64 bits o una Raspberry Pi."; exit 1 ;;
esac

# 1. Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "· Instalando Docker…"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
fi
DOCKER="docker"
docker info >/dev/null 2>&1 || DOCKER="sudo docker"
sudo systemctl enable --now docker >/dev/null 2>&1 || true

# 2. Que la laptop no se duerma (ni al cerrar la tapa): si se suspende, Liquid no la encuentra
if [ -f /etc/systemd/logind.conf ]; then
  for clave in HandleLidSwitch HandleLidSwitchExternalPower HandleLidSwitchDocked; do
    if grep -qE "^#?${clave}=" /etc/systemd/logind.conf; then
      sudo sed -i -E "s/^#?${clave}=.*/${clave}=ignore/" /etc/systemd/logind.conf
    else
      echo "${clave}=ignore" | sudo tee -a /etc/systemd/logind.conf >/dev/null
    fi
  done
  echo "· La tapa ya no suspende la laptop (se aplica al reiniciar)"
fi
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target >/dev/null 2>&1 \
  && echo "· Suspensión desactivada" || true

# 3. Carpetas (slskd y el puente corren como el usuario 1000)
mkdir -p slskd/incomplete musica datos tailscale-estado
sudo chown -R 1000:1000 slskd musica datos 2>/dev/null || true

# 4. .env con claves aleatorias (solo la primera vez)
aleatorio() { tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1"; }
if [ ! -f .env ]; then
  echo
  echo "Necesito una clave de Tailscale (gratis, sin tarjeta):"
  echo "  1) Entra en https://login.tailscale.com (con Google, Microsoft o GitHub)"
  echo "  2) Settings → Keys → Generate auth key… (deja todo como viene) → Generate → Copia"
  read -r -s -p "Pega aquí la clave de Tailscale (tskey-auth-…): " TS_AUTHKEY; echo
  cat > .env <<ENV
LIQUID_CLAVE=$(aleatorio 40)
SLSKD_API_KEY=$(aleatorio 40)
SLSKD_WEB_USUARIO=liquid
SLSKD_WEB_CONTRASENA=$(aleatorio 24)
ORIGENES=https://lukoffmon.github.io
TS_AUTHKEY=${TS_AUTHKEY}
TS_NOMBRE=liquid-skd
PUBLICO=
ENV
  chmod 600 .env
  echo "· Creado .env"
fi
# shellcheck disable=SC1091
set -a; . ./.env; set +a

# 5. Configuración de slskd (solo la primera vez: tu cuenta de Soulseek)
if [ ! -f slskd/slskd.yml ]; then
  read -r -p "Usuario de Soulseek (si no tienes, inventa uno nuevo): " SLSK_USUARIO
  read -r -s -p "Contraseña de Soulseek: " SLSK_CONTRASENA; echo
  comillas() { printf "'%s'" "${1//\'/\'\'}"; }
  cat > slskd/slskd.yml <<YML
# Generado por instalar.sh
soulseek:
  username: $(comillas "$SLSK_USUARIO")
  password: $(comillas "$SLSK_CONTRASENA")
  listen_port: 50300
directories:
  incomplete: /app/incomplete
  downloads: /musica
shares:
  directories:
    - /musica
web:
  authentication:
    username: $(comillas "$SLSKD_WEB_USUARIO")
    password: $(comillas "$SLSKD_WEB_CONTRASENA")
    api_keys:
      liquid:
        key: $(comillas "$SLSKD_API_KEY")
        cidr: 0.0.0.0/0,::/0
YML
  chmod 600 slskd/slskd.yml
  sudo chown 1000:1000 slskd/slskd.yml 2>/dev/null || true
  echo "· Creado slskd/slskd.yml"
fi

# 6. Arranque
$DOCKER compose pull
$DOCKER compose up -d

# 7. La dirección pública de Tailscale (https://<nombre>.<tu-red>.ts.net)
echo "· Esperando a Tailscale…"
DIRECCION=""
for _ in $(seq 1 60); do
  DIRECCION=$($DOCKER compose exec -T tailscale tailscale status --json 2>/dev/null \
    | grep -m1 '"DNSName"' | sed -E 's/.*"DNSName": *"([^"]+)\.".*/\1/' || true)
  [ -n "$DIRECCION" ] && break
  sleep 2
done
if [ -z "$DIRECCION" ]; then
  echo "✗ Tailscale no arrancó. Mira: $DOCKER compose logs tailscale"
  exit 1
fi
if [ "${PUBLICO:-}" != "https://${DIRECCION}" ]; then
  sed -i -E "s#^PUBLICO=.*#PUBLICO=https://${DIRECCION}#" .env
  $DOCKER compose up -d puente
fi

echo
echo "== Listo =="
echo "Comprueba en el navegador (puede tardar 1–2 minutos la primera vez): https://${DIRECCION}/salud"
echo "Si no abre: activa HTTPS y Funnel en Tailscale (PROTOCOLO.md, paso 4)."
echo
echo "En Liquid: Ajustes → Liquid ATK → SKd · Soulseek"
echo "  Dirección:  https://${DIRECCION}"
echo "  Clave:      ${LIQUID_CLAVE}"
echo
echo "(La clave también está en .env de esta carpeta. No la compartas.)"
