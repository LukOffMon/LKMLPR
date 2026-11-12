# Protocolo: la laptop vieja como servidor de Liquid SKd

Convierte una laptop vieja (Linux de 64 bits) en tu servidor de **Liquid ATK + SKd**: Soulseek encendido 24 h en tu casa, sin tarjeta, sin abrir puertos del router y sin comprar dominio. Liquid llega a ella por una dirección `https://` gratis de **Tailscale Funnel**.

```
Liquid (tu teléfono, cualquier sitio)
   │ https://liquid-skd.<tu-red>.ts.net  + tu clave
   ▼
Laptop en casa (siempre encendida, tapa cerrada)
   ├─ Tailscale → la dirección https pública (Funnel)
   ├─ Puente    → lo único con lo que habla Liquid
   ├─ slskd     → Soulseek
   └─ musica/   → tus canciones
```

> Mucha música en Soulseek tiene derechos de autor: úsalo para tu escucha personal y bajo tu responsabilidad.

---

## Paso 1 · Comprobar la laptop (5 min)

Enciéndela, abre una terminal y ejecuta:

```bash
uname -m; cat /etc/os-release | head -2; free -h; df -h /
```

- `uname -m` debe decir **x86_64** (o aarch64). Si dice **i686/i386**, es de 32 bits y no sirve.
- Conviene tener **2 GB de RAM o más** y espacio libre para la música (`df -h /`).

**Si no arranca o el Linux está roto:** reinstala **Ubuntu Server 24.04** (ligero). Desde otra PC, descarga la imagen de ubuntu.com/download/server, grábala en una USB de 4 GB+ con **balenaEtcher**, arranca la laptop desde la USB (tecla F12, F2 o Esc al encender) y sigue el instalador: usuario y contraseña, «Install OpenSSH server» marcado. Conéctala por cable o Wi-Fi.

## Paso 1b · Laptop sin contraseña o de segunda mano: instalación automática (30 min)

Si no sabes la contraseña de la laptop (o quieres borrar lo del dueño anterior), reinstala Debian 13 **automáticamente**: solo escribes una dirección, tu contraseña y confirmas el borrado. Necesitas una **memoria USB de 8 GB o más** (se borra) y otra computadora para prepararla.

1. **En tu otra computadora:** descarga la imagen **Debian 13 netinst amd64** (unos 750 MB) desde **debian.org** (botón de descarga de la portada) e instala **balenaEtcher** (balena.io/etcher).
2. **balenaEtcher** → *Flash from file* (la imagen) → *Select target* (tu USB) → *Flash*.
3. **En la laptop vieja**, con el **cable de red** conectado al router y la USB puesta: enciende pulsando **F12** varias veces y elige la USB. (Si F12 no hace nada: enciende con **F2** → BIOS → *Main* → **F12 Boot Menu: Enabled** → **F10** para guardar, y repite.)
4. En el menú de Debian: **Advanced options → Automated install** (o *Graphical automated install*).
5. Espera a que configure la red. Cuando pida **«Location of initial preconfiguration file»**, escribe exactamente:
   ```
   https://raw.githubusercontent.com/LukOffMon/LKMLPR/main/liquid-skd-laptop/preseed.cfg
   ```
6. Te pedirá **tu contraseña nueva** (dos veces; apúntala en papel) y **una confirmación** para borrar el disco → **Sí**. Si pregunta en qué disco instalar, elige el de la laptop (no la USB).
7. Cuando termine y reinicie, **saca la USB**. Entra con el usuario **`liquid`** y tu contraseña. El protocolo ya está descargado en `~/LKMLPR` y la pantalla te dice los siguientes pasos. Sigue desde el **paso 3** de abajo (cuenta de Tailscale).

El archivo con las respuestas automáticas es [`preseed.cfg`](preseed.cfg): idioma español (México), teclado latinoamericano, usuario `liquid` con `sudo`, sin escritorio, con SSH, y deja descargado este protocolo.

## Paso 2 · Bajar este protocolo (2 min)

```bash
sudo apt-get update && sudo apt-get install -y git curl
git clone https://github.com/LukOffMon/LKMLPR.git
cd LKMLPR/liquid-skd-laptop
```

## Paso 3 · Cuenta de Tailscale (3 min, gratis, sin tarjeta)

1. Entra en **login.tailscale.com** con Google, Microsoft o GitHub.
2. **Settings → Keys → Generate auth key…** → deja todo como viene → **Generate key** → **cópiala** (empieza por `tskey-auth-`). La pegarás en el paso 5.

## Paso 4 · Activar HTTPS y Funnel en Tailscale (2 min)

En **login.tailscale.com/admin**:

1. **DNS** → abajo, **HTTPS Certificates → Enable HTTPS**.
2. **Access controls**: comprueba que el archivo de reglas tiene el permiso de Funnel (las redes nuevas lo traen). Si no aparece `"funnel"`, añade esto dentro de las llaves principales y **Save**:

```json
"nodeAttrs": [
  { "target": ["autogroup:member"], "attr": ["funnel"] }
]
```

## Paso 5 · Instalar (5–10 min)

En la laptop, dentro de `LKMLPR/liquid-skd-laptop`:

```bash
bash instalar.sh
```

Te pedirá tu **contraseña de Linux** (para instalar), la **clave de Tailscale** (paso 3) y tu **usuario y contraseña de Soulseek** (si no tienes, inventa unos: la cuenta se crea sola). Hace todo lo demás:

- instala Docker,
- desactiva la suspensión (también al cerrar la tapa),
- genera las claves secretas en `.env`,
- arranca slskd, el puente y Tailscale,
- y te da la **Dirección** y la **Clave** de Liquid. **Guárdalas.**

Reinicia la laptop una vez (`sudo reboot`) para que lo de la tapa se aplique. Todo vuelve a arrancar solo.

## Paso 6 · Comprobar (1 min)

En el navegador del teléfono abre `https://liquid-skd.<tu-red>.ts.net/salud` (la dirección que te dio el instalador). Debe responder:

```json
{"ok":true,"nombre":"Liquid SKd"}
```

La primera vez puede tardar 1–2 minutos (Tailscale saca el certificado).

## Paso 7 · Conectar Liquid (1 min)

Liquid → **Ajustes → Liquid ATK → SKd · Soulseek** → pega **Dirección** y **Clave** → **Conectar**. Debe decir «Conectado · Soulseek en línea» y la marca pasa a **Liquid ATK +SKd**.

Desde ahí: busca como siempre, toca un resultado **SKd** y se baja a tu laptop y suena.

---

## Día a día

- **Deja la laptop enchufada y con internet**, tapa cerrada si quieres. Si se apaga, Liquid sigue funcionando con su música y con lo que hayas descargado al teléfono; solo deja de llegar a tu música de SKd.
- Tras un corte de luz, al encenderla todo arranca solo.

| Qué | Comando (en `LKMLPR/liquid-skd-laptop`) |
|---|---|
| ¿Está todo en marcha? | `docker compose ps` |
| Ver errores | `docker compose logs -f --tail 60` |
| Actualizar | `git pull && docker compose pull && docker compose up -d` |
| Ver la clave | `grep LIQUID_CLAVE .env` |
| Espacio libre | `df -h /` |

Tu música está en `liquid-skd-laptop/musica/`. Si copias ahí tus propios MP3, aparecen en Liquid solos.

## Si algo falla

- **`/salud` no abre:** revisa el paso 4 (HTTPS y Funnel) y `docker compose logs tailscale`.
- **«Soulseek sin conexión» en Liquid:** usuario o contraseña de Soulseek mal escritos (o ese usuario ya existe con otra contraseña). Corrige `slskd/slskd.yml` y `docker compose restart slskd`.
- **Descargas en cola mucho tiempo:** normal a veces; prueba otra copia. Si tu router lo permite, redirige el puerto **50300 TCP** a la laptop: Soulseek va mucho mejor.
- **«La clave no es correcta»:** vuelve a copiar `LIQUID_CLAVE` de `.env`, sin espacios.

## Seguridad

- Liquid solo conoce la **clave del puente**; tu contraseña de Soulseek y la de slskd se quedan en la laptop.
- Nunca subas `.env` ni `slskd/` a ningún repositorio (el `.gitignore` ya lo impide).
