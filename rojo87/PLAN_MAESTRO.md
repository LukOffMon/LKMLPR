# Rojo 87 · Plan maestro

> **Rojo 87 es la luz roja de tu restaurante.**
> Una sola app, en los celulares que ya existen, que cubre la noche completa:
> antes de llegar, en la mesa, en la cocina y el regreso. Sin aparatos, sin instalación y sin comisión por pedido.

Fecha: 23 nov. 2026 · Sitio: `rojo87/index.html` → https://lukoffmon.github.io/LKMLPR/rojo87/

---

## 1. Las 6 ideas de origen, analizadas

Fuente: video recopilatorio (2 min 17 s), nota de voz (2 min 31 s) y video de referencia visual (25 s), transcritos y revisados fotograma a fotograma.

| # | Referencia | Qué hace | Dolor real que ataca | Límite | Qué se queda en Rojo 87 |
|---|---|---|---|---|---|
| 1 | **turnolisto** (barberos) | El cliente entra a un link, ve servicios con precio, elige día y hora y confirma. | El dueño suelta el trabajo para contestar y pierde al cliente que escribió. | Es de un solo oficio y solo agenda. | **Reservas por link**: la agenda se llena sola mientras se cocina. |
| 2 | **pagessbyme** ("Tu camarero no puede estar en 12 mesas. Tu web sí") | Pedido desde la mesa, cuenta compartida, "pulpo agotado" marcado por cocina y vista de cocina por mesa. | El mesero es el cuello de botella; nadie sabe qué se acabó. | Hecho a mano para cada local. | **Pedido por QR** con número de mesa, **cuenta de mesa compartida** y **agotados en un toque**. |
| 3 | **menu4d** ("8 mesas escanearon el QR a la vez") | Se ve el plato antes de pedirlo, la cocina recibe en orden con su tiempo y el panel muestra mesas, pedidos y venta. | Cocina desordenada; pedidos mal anotados. | El plato en 3D cuesta producirlo. | **Pantalla de cocina** en cualquier tablet o celular viejo + **resumen de la noche**. El "plato sobre la mesa" se cambia por **foto real** (regla LKM'r). |
| 4 | **bozu** (disco: "menos barra… y más rondas") | Se pide desde el lugar en el antro; no se hace fila. | Fila en la barra = menos rondas vendidas. | Solo antros. | Botón **"Otra ronda"** (repite lo último en un toque) y **número para recoger** en barra. |
| 5 | **flpit lighting** ("No buttons. Staff know who needs them.") | Lámpara física en la mesa; el personal ve quién necesita algo. | Hacer señas, esperar y sentirse ignorado. | Hardware: cuesta, se carga ("24+ horas") y se instala. Solo para lugares grandes y caros. | **Luz Roja virtual**: un toque en el celular del cliente prende su mesa en el mapa del personal (llamar, cuenta, otra ronda). El mismo efecto **sin comprar nada**. De aquí sale el nombre. |
| 6 | **Agente de dentista** ("Véndele esto a un dentista por $3,000") | WhatsApp de noche: audio → texto → detecta urgencia → revisa agenda → ofrece 2 horarios → crea cita → recuerda un día antes. | Mensajes que nadie contesta = clientes que se van con otro. | Necesita IA y la API de WhatsApp (cuesta). | **Concierge de WhatsApp**: reservas, "¿tienen mesa?", horarios, recordatorios. Fase 0 con respuestas rápidas; fase 1 con IA. |
| — | **samanastudios** ("FUTURE of web design") | Sitio de escenas: collage de grabado blanco y negro sobre rojo; botella que sirve, ojos, columnas. | — | — | **Identidad del sitio**: rojo, negro y hueso, ilustración tipo grabado y escenas al hacer scroll. |

**Conclusión del análisis:** las 6 ideas son el mismo problema visto desde puntos distintos. **El restaurante pierde dinero en 4 momentos**, y cada referencia arregla solo uno:

1. **Antes de llegar**: mensajes y reservas sin contestar (ideas 1 y 6).
2. **En la mesa**: esperar para pedir y para pagar (ideas 2, 4 y 5).
3. **En la cocina**: desorden y platos agotados (ideas 2 y 3).
4. **Después**: el cliente no regresa y nadie se entera de por qué (ninguna lo cubre: es el hueco que llena Rojo 87).

Rojo 87 cubre los cuatro con **una sola cuenta, un solo QR y un solo panel**.

---

## 2. Producto: las 5 luces

| Luz | Para el cliente | Para el restaurante | Viene de |
|---|---|---|---|
| **1 · Carta** | Carta con fotos reales, precios, alérgenos y **4 idiomas** (turistas). | Cambiar precios y marcar agotados desde el celular. | 2, 3 |
| **2 · Comanda** | Pide desde la mesa; la cuenta se comparte entre los de la mesa. | Pantalla de cocina por orden de llegada, con tiempo; "listo" avisa al mesero. | 2, 3 |
| **3 · Luz Roja** | Un toque: *Llamar*, *La cuenta*, *Otra ronda*. | Mapa del salón en los celulares del personal; la mesa se prende en rojo con el motivo y el tiempo de espera. | 4, 5 |
| **4 · Agenda** | Reserva por link o por WhatsApp a cualquier hora. | Agenda que se llena sola y recordatorio un día antes. | 1, 6 |
| **5 · Regreso** | Sello de lealtad y reseña en un toque. | Reseñas buenas a Google; las malas llegan **en privado** primero. Lealtad (se reutiliza Mr Key). | nuevo |

Además, el **panel de la noche**: mesas ocupadas, pedidos, tiempo promedio de cocina y venta.

**Principio de producto:** todo funciona con el celular del cliente y un celular o tablet del local. Nada se instala desde una tienda de apps: es una web que se puede anclar a la pantalla de inicio (PWA).

---

## 3. Cómo se adapta a cada lugar (recetas)

No se cobra más al que puede pagar más. **Se cobra lo que el lugar necesita.** El vendedor (o el propio dueño en el sitio) responde una pregunta, *"¿qué es tu lugar?"*, y Rojo 87 arma la receta:

| Tipo de lugar | Cómo trabaja | Luces que necesita | Plan |
|---|---|---|---|
| **Fonda / taquería / puesto** | Mostrador, sin meseros, mucho para llevar. | Carta + pedido a WhatsApp o número para recoger. | **Carta** |
| **Café / brunch** | Pocas mesas, rotación alta, clientes de regreso. | Carta + Comanda + Luz Roja. | **Servicio** |
| **Restaurante con meseros** | 10 a 40 mesas, cocina con varias estaciones. | Las 5 luces. | **Completo** |
| **Bar / antro** | Rondas, barra saturada, mesas y reservados. | Carta + Otra ronda + Luz Roja + Agenda (reservados). | **Servicio** o **Completo** |
| **Alta cocina** | Reservas, experiencia y turistas. | Agenda + Concierge + Luz Roja en modo silencioso (solo la ve el capitán) + carta en 4 idiomas. Opcional: lámparas físicas (fase 2). | **Completo** |
| **Cadena / franquicia** | Varias sucursales. | Completo + panel por sucursal y comparativo. | **Cadena** |

**Adaptación física (sin costo para el cliente):** tarjeta de mesa con QR y número, cartel de "Toca para llamar" y la cocina usa la tablet o celular viejo que ya tiene.

---

## 4. Precio

### Primer mes: **$1** (todo incluido)
Un dólar por probar **todas** las luces durante un mes: 1 USD · $20 MXN · 1 €. Se cobra para que el dueño se comprometa (un mes gratis se olvida; uno pagado se usa) y para validar el método de pago.

### Después, según la receta

| Plan | Incluye | MXN / mes | USD / mes | EUR / mes |
|---|---|---|---|---|
| **Carta** | Carta + pedidos a WhatsApp + agotados + 4 idiomas | **$290** | **$15** | **15 €** |
| **Servicio** | Carta + Comanda + Luz Roja + panel | **$690** | **$39** | **35 €** |
| **Completo** | Las 5 luces + Concierge de WhatsApp + reseñas + lealtad | **$1,290** | **$69** | **65 €** |
| **Cadena** | Completo por sucursal + panel general (desde 3) | **$990 c/u** | **$55 c/u** | **49 € c/u** |

- **Pago anual:** 2 meses gratis.
- **0 % de comisión por pedido.** Las apps de reparto cobran comisión por cada pedido; Rojo 87 cobra una cuota fija.
- **Sin plazo forzoso:** se cancela cuando se quiera.
- **Alta gratis:** nosotros capturamos la carta.

### Por qué hasta el dueño más tacaño lo paga
El argumento no es "la tecnología": **es una ronda**.
- Plan Servicio ($690 MXN) ÷ 30 noches = **$23 por noche**. Una sola cerveza extra por noche lo paga.
- Ejemplo de restaurante: 12 mesas × 2 turnos × 30 noches = 720 mesas al mes. Si solo **1 de cada 10 mesas** pide **una cosa más** de $120 porque no tuvo que buscar al mesero, entran **$8,640** al mes contra $690.
- El sitio trae una **calculadora** que hace esta cuenta con los números del propio local, con supuestos que el dueño puede mover.

---

## 5. Arquitectura sin servidor (fase 0 = $0)

| Pieza | Fase 0 (hoy, sin capital) | Fase 1 (con capital) |
|---|---|---|
| Sitio y app | GitHub Pages (estático, PWA) | Igual + dominio `rojo87.app` |
| Cuentas, licencias y lealtad | **Ya existe:** Edge Function `rojo87` en Supabase (`rojo87/supabase/`), tablas `r87_*`. Antes era Mr Key. | Igual |
| Datos en tiempo real (pedidos, luces) | Supabase gratis: Postgres + Realtime (mismo proyecto) | Supabase Pro ($25 USD/mes): se paga con 3 clientes del plan Carta |
| WhatsApp | Enlaces `wa.me` + respuestas rápidas preescritas | WhatsApp Cloud API + IA: audio → texto → intención → agenda (el "agente del dentista") |
| Pagos del cliente final | "Pedir la cuenta" + efectivo, terminal o transferencia | Pago en mesa (Stripe / Mercado Pago) |
| Cobro de la suscripción | Liga de pago de Stripe / Mercado Pago (sin código) | Suscripciones automáticas |
| Hardware | Ninguno | Fase 2: lámparas Rojo 87 opcionales para alta cocina (renta mensual) |

**Límite que hay que vigilar:** Supabase gratis permite 200 conexiones en tiempo real a la vez. Alcanza para unos 15 a 30 locales abiertos al mismo tiempo; al llegar ahí, se pasa a Pro con el dinero que ya entró. **El crecimiento se paga a sí mismo.**

---

## 6. Cómo se vende (empezar mañana)

Las herramientas ya están hechas (sección 10):

1. **Panel de prospectos** (`rojo87/prospectos/`): restaurantes, bares y cafés conocidos de México, Estados Unidos, España, Francia y Latinoamérica. Por cada uno, un **primer mensaje de invitación sin enlaces** (tres versiones por idioma que se alternan, con el nombre y el giro del lugar). Solo a quien responde que sí se le manda el **segundo mensaje**: el sitio, el tráiler y un **QR de su prueba de $20 MXN / $1 USD** que abre el alta con el nombre de su lugar ya escrito.
2. **Demo en 60 segundos:** el vendedor deja la tarjeta en una mesa, el dueño escanea, toca *Llamar* y ve cómo se prende la mesa en el celular del vendedor (sección "Pruébalo" del sitio).
3. **Tráiler de 60 s** (`rojo87/promo/`) para Reels, TikTok y estados de WhatsApp, con su estrategia en `promo/MARKETING.md`.
4. **Socios:** comisión sugerida del **30 % del primer año** de cada cliente que cierren.

Los prospectos de `menus-qr` **no** son prospectos de Rojo 87: es otro negocio y no se mezclan.

## 7. El camino a 5 millones de euros

Es una meta, no una promesa. Así se ve en números:

- Precio promedio por local (mezcla de planes): **≈ 45 € / mes**.
- **5,000,000 € al año ÷ (45 € × 12) ≈ 9,300 locales.**
- México tiene más de medio millón de negocios de preparación de alimentos y bebidas (INEGI, Censos Económicos), así que 9,300 es **menos del 2 %**. A eso se suman España y Latinoamérica: el sitio ya está en 4 idiomas.

| Etapa | Locales | Ingreso anual aprox. | Qué la desbloquea |
|---|---|---|---|
| Validación | 10 | ~5 k € | Panel de prospectos + demo en mesa |
| Tracción | 100 | ~55 k € | Socios con comisión, primer caso de éxito con números |
| Capital | 1,000 | ~540 k € | Inversión semilla → servidor, Concierge con IA, pago en mesa |
| Escala | 9,300 | **~5 M €** | Cadenas, España/LatAm, lámparas premium |

**Lo que hace valioso el negocio (para un inversionista):** cobro mensual recurrente, costo de servidor casi cero por local, cero hardware obligatorio y datos de operación reales (tiempos de cocina, platos más pedidos, horas pico) que ninguna app de reparto tiene desde dentro del salón.

---

## 8. Riesgos y respuestas

| Riesgo | Respuesta |
|---|---|
| "Mis clientes no usan QR" | Sigue funcionando a la antigua: el mesero puede capturar el pedido desde su celular en la misma Comanda. |
| Internet del local | La carta queda guardada en el celular (PWA) y los pedidos se reintentan solos. |
| El mesero siente que lo reemplazan | Lo contrario: deja de correr a anotar y lleva platos. Las propinas suben si la atención es rápida. |
| Copias | La ventaja es el paquete completo + el alta gratis + la red de socios, no una función suelta. |
| Políticas de WhatsApp | Fase 0 no automatiza envíos (solo enlaces); la fase 1 usa la API oficial con plantillas aprobadas. |

---

## 9. Pendientes por decidir

- Número de WhatsApp y correo de ventas de Rojo 87 (en el sitio: `CONFIG.whatsapp` y `CONFIG.email`). Mientras estén vacíos, el botón abre WhatsApp para elegir contacto.
- Dominio propio.
- Liga de cobro del primer mes ($1).
- Primer local piloto para grabar el caso de éxito.

---

## 10. Lo que ya está construido

| Pieza | Dónde | Para quién |
|---|---|---|
| Sitio de venta en 4 idiomas | `rojo87/index.html` | Dueños de restaurantes |
| Tráiler de 60 s + estrategia | `rojo87/promo/` | Redes y WhatsApp |
| **Cuenta del restaurante + lealtad** (luz 5): panel del dueño, QR del mostrador, sellado del equipo, tarjeta del cliente, campañas y métricas | `rojo87/lealtad/` (antes Mr Key) | Restaurante, equipo y clientes |
| **Licencias y pagos** (llave maestra): aprobar cuentas, registrar el pago de $20 del primer mes o del plan, renovar, cancelar, ingreso mensual | `rojo87/lealtad/llave-maestra.html` (oculta) | Solo tú |
| **Prospectos**: lista por país, invitación por WhatsApp, segundo mensaje con QR de prueba, embudo y límite diario | `rojo87/prospectos/` (oculta, con PIN) | Solo tú |
| API y base de datos | `rojo87/supabase/` | — |

**Flujo completo de una venta:** invitación (prospectos) → dice que sí → segundo mensaje con QR → el dueño crea su cuenta (queda pendiente 12 h) → paga $20 MXN → en la llave maestra registras el pago con el plan *Primer mes ($1)* → su cuenta queda activa 1 mes → al terminar registras su plan (Carta, Servicio, Completo o Cadena).
