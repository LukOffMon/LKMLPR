# Sitio LKM'r Company

Un solo archivo: `index.html` (HTML + CSS + JS, sin dependencias obligatorias). Las fuentes de Google son opcionales: si no cargan, usa las del sistema.

## 1. Personaliza (5 minutos)

Abre `index.html` y edita el objeto `window.CONFIG` al inicio:

- `whatsapp`: tu número con lada internacional, sin `+` ni espacios. Ej. `"524491234567"`. **Mientras esté vacío, los botones abren WhatsApp sin destinatario.**
- `servicios[].desde` y `paquetes[].precio`: precios en MXN (se actualizan en todo el sitio).
- `redes`: links de tus perfiles (las vacías no se muestran).
- `portafolio`: cuando tengas un cliente real (con su permiso), cambia `conceptual: false`, pon su nombre, una `imagen` (`.webp` de ~800 px) y el resultado medido.
- `testimonios`: **solo testimonios reales** y con permiso. Nunca inventes.
- Foto: en la sección "Sobre mí" reemplaza el contenido de `.photo` por tu `<img>` (hay un comentario con el ejemplo).
- Cuando tengas dominio: cambia `CONFIG.url` y las etiquetas `og:url` / `og:image` del `<head>`.

## 2. Publica gratis

**Netlify (lo más fácil):** entra a app.netlify.com/drop y arrastra la carpeta `lkmr`. Listo, te da una URL. Después puedes conectar tu dominio.

**GitHub Pages:** en el repositorio → Settings → Pages → "Deploy from a branch" → elige la rama y la carpeta. Si publicas desde la raíz, el sitio queda en `https://usuario.github.io/repo/lkmr/`.

**Vercel:** vercel.com → Add New Project → importa el repo → Root Directory: `lkmr` → Deploy.

## 3. Después de publicar

- Pon el link en tu Google Business Profile, Instagram, WhatsApp Business y firma de correo.
- Prueba todos los botones de WhatsApp desde tu celular.
