# Rojo 87 · Marketing maestro

Video: `rojo87-trailer-60s.mp4` (vertical 1080×1920, 60 s, voz + música + subtítulos).
Pensado para Reels, TikTok, Shorts y estados de WhatsApp: el mismo formato de los videos que lo inspiraron.

## 1. La idea en una línea
**"Tu mesero no puede estar en 12 mesas. La luz roja, sí."**
No vendemos software: vendemos **la mesa que ya no espera**. Todo el mensaje gira alrededor de una sola imagen fácil de recordar: una mesa que se prende en rojo cuando necesita algo.

## 2. Estructura del tráiler (por qué funciona)

| Segundo | Escena | Función |
|---|---|---|
| 0–6 | "Viernes. 21:00. Lleno." | **Gancho de identidad.** El dueño se reconoce en 3 palabras, antes de que pueda deslizar. |
| 6–17 | Se prenden 12 mesas, "Tu mesero no puede estar en 12 mesas" | **El dolor, en imagen.** Cada "ding" es dinero esperando. El contador sube a 12. |
| 17–20 | Pantalla roja: "La luz roja, sí." | **El giro.** Corte seco con golpe de sonido: aquí se queda el que iba a deslizar. |
| 20–22 | Logo ROJO 87 | La marca aparece **después** del problema, no antes. |
| 22–31 | Dos celulares: el cliente toca, la mesa 7 se prende en el del mesero | **Demostración**, no promesa: se ve el producto funcionando. |
| 31–38 | Cocina en orden + "Agotado" | Segundo dolor resuelto (la cocina), con un detalle concreto: el pulpo que se acabó. |
| 38–44 | 23:47, chat de WhatsApp con mesa apartada | Tercer dolor: el dinero que se pierde de noche. |
| 44–50 | "Sin aparatos. Sin instalación. 0% comisión." | **Quita las tres objeciones** antes de que aparezcan. |
| 50–54 | "$1" gigante | **La oferta irresistible.** El precio de prueba baja el riesgo a cero. |
| 54–60 | "Enciende tu luz." + liga | Llamado a la acción y marca. |

Reglas que sigue:
- **Subtítulos tipo karaoke**: la mayoría ve los reels sin sonido.
- **Un solo mensaje por escena** y un golpe de sonido en cada cambio, para mantener la atención.
- **Honesto**: el concierge con IA lleva su nota de "se activa por etapas", y no se inventan cifras ni clientes.

## 3. Dónde y cómo publicarlo

**Semana 1 · lanzamiento**
- Reel / TikTok / Shorts con el tráiler completo. Texto del post:
  > Tu mesero no puede estar en 12 mesas. La luz roja, sí. 🔴
  > Rojo 87: pedidos desde la mesa, cocina en orden y reservas por WhatsApp. Sin aparatos y 0% comisión.
  > Primer mes por $1 👉 liga en la bio
  > #restaurantes #restauranteros #bares #gastronomía #emprendedores #México
- Estado de WhatsApp con el tráiler para toda tu lista de contactos.
- Invitaciones por WhatsApp desde el **panel de prospectos** (`rojo87/prospectos/`): primer mensaje sin enlaces y, solo a quien dice que sí, el segundo con el tráiler, el sitio y el QR de su prueba de $20.

**Semanas 2 a 4 · recortes de 15 segundos** (se sacan del mismo video, uno por dolor):
1. "12 mesas" (0–22 s): el gancho más fuerte, para anuncios.
2. "Un toque" (22–31 s): la demo.
3. "23:47" (38–44 s): para bares y restaurantes con reservas.
4. "$1" (44–60 s): para retargeting de quien ya vio el video completo.

**Anuncios pagados** (cuando haya presupuesto): radio de 5 a 10 km alrededor de zonas de restaurantes, con el interés "dueños de pequeños negocios / restaurantes". Se prueba el recorte 1 contra el 4 con poco presupuesto y se escala el que consiga más mensajes de WhatsApp.

## 4. En persona (lo que más vende)
El vendedor llega con el tráiler en el celular y con la demo del sitio abierta (sección "Pruébalo"):
1. Pone el video (60 s).
2. Le da su celular al dueño: "toca *Llamar al mesero*" y le enseña cómo se prende la mesa 7 en otro celular.
3. Cierra: "Pruébalo un mes por $1. Yo subo tu carta hoy."

## 5. Métrica que importa
Solo una: **mensajes de WhatsApp de dueños por cada 1,000 vistas**. Si el gancho no retiene (más de 50 % se va antes del segundo 6), se cambia el inicio y no el resto.

## 6. Cómo volver a generar el video
Desde `rojo87/promo/` (requiere Python con `edge-tts`, `numpy` y `playwright`, ffmpeg y Microsoft Edge):

```
python voz.py      # voz por escena (es-MX-JorgeNeural) + tiempos por palabra
python musica.py   # música y efectos sintetizados + momentos clave
python render.py   # 1,800 cuadros → MP4 con audio mezclado
```

Para cambiar el texto, se edita `guion.json` y se corren los tres. La animación (`trailer.html`) se acomoda sola a los nuevos tiempos. Para ver una escena fija: `python render.py --stills 12 30`.
