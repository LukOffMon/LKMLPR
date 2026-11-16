import type { Protocolo } from '../types'

export const PROTOCOLOS: Protocolo[] = [
  {
    id: 'dia0-7',
    nombre: 'Protocolo Día 0–7',
    objetivo: 'Elegir UNA ruta, armar portafolio mínimo, contactar 20 prospectos y buscar la primera venta.',
    duracion: '7 días · 2–3 h diarias',
    intro:
      'La primera semana no es para "investigar más". Es para decidir y moverte. Tu meta no es ganar mucho: es demostrarte que alguien te paga por algo que haces. Todo lo demás se construye encima de ese primer peso.',
    bloques: [
      {
        titulo: 'Día 0 — Decidir',
        items: [
          { id: 'd0-diag', texto: 'Completa el Diagnóstico de la app', detalle: 'Te recomienda 3 rutas según tu perfil.' },
          { id: 'd0-elige', texto: 'Elige UNA ruta del catálogo y márcala como "mi ruta"', detalle: 'Regla: una sola por 30 días. Cambiar cada semana es la forma más rápida de no ganar nada.' },
          { id: 'd0-lee', texto: 'Lee la ficha completa y copia sus 10 pasos a tus tareas', detalle: 'Usa el botón "Agregar pasos a mis tareas".' },
          { id: 'd0-horario', texto: 'Bloquea en tu calendario 2 h diarias fijas (ej. 17:00–19:00)', detalle: 'Mismo horario todos los días: la disciplina se automatiza con horario, no con motivación.' },
        ],
      },
      {
        titulo: 'Días 1–3 — Portafolio mínimo',
        items: [
          { id: 'd1-muestras', texto: 'Haz 3 muestras de tu servicio (aunque sean para negocios imaginarios o conocidos)', detalle: 'Mejor 3 buenas que 10 mediocres.' },
          { id: 'd1-publica', texto: 'Publica las muestras en un lugar con link (Drive ordenado, Instagram, Netlify, Behance)' },
          { id: 'd2-oferta', texto: 'Escribe tu oferta en una frase: "Ayudo a [quién] a [resultado] con [servicio]"' },
          { id: 'd2-precio', texto: 'Define precio de arranque (usa el de la ficha) y qué incluye' },
          { id: 'd3-perfil', texto: 'Prepara WhatsApp Business: foto profesional, descripción, catálogo con tu servicio' },
        ],
      },
      {
        titulo: 'Días 3–5 — 20 contactos',
        items: [
          { id: 'd3-lista', texto: 'Arma una lista de 30 prospectos en el CRM (nombre, negocio, contacto)', detalle: 'Google Maps, Instagram, tu colonia, conocidos de tu familia.' },
          { id: 'd4-10', texto: 'Envía los primeros 10 mensajes personalizados', detalle: 'Usa las plantillas de la ficha, pero cambia la primera línea para cada negocio.' },
          { id: 'd5-10', texto: 'Envía 10 mensajes más (total 20)' },
          { id: 'd5-familia', texto: 'Avisa a 10 familiares/conocidos qué ofreces y pide que te recomienden', detalle: 'Tu primera venta casi siempre viene de alguien que te conoce o que te recomienda.' },
        ],
      },
      {
        titulo: 'Días 6–7 — Cerrar',
        items: [
          { id: 'd6-seguimiento', texto: 'Da seguimiento a quienes no contestaron (un mensaje amable, no más)' },
          { id: 'd6-llamada', texto: 'Ten al menos 1 plática (llamada, visita o chat largo) con un interesado' },
          { id: 'd7-oferta', texto: 'Haz al menos 1 propuesta concreta con precio y fecha de entrega' },
          { id: 'd7-venta', texto: 'Primera venta o, si no llegó, analiza: ¿cuántos respondieron? ¿por qué no compraron?' },
          { id: 'd7-diario', texto: 'Haz tu primera revisión semanal en el Diario' },
        ],
      },
    ],
    notas: [
      'Si al día 7 no vendiste, es normal. Lo que NO es normal es no haber mandado los 20 mensajes. Mide el esfuerzo, no solo el resultado.',
      'Ofrecer el primer trabajo a precio reducido a cambio de testimonio está bien. Trabajar gratis indefinidamente, no.',
    ],
  },
  {
    id: '30-dias',
    nombre: 'Protocolo 30 días',
    objetivo: 'Llegar a tus primeros $3,000–$5,000 MXN (estimación, no promesa).',
    duracion: '4 semanas · 12–18 h por semana',
    intro:
      'Ya validaste que alguien paga. Ahora conviertes eso en sistema: volumen de prospección constante, entregas impecables y primeros testimonios. La meta de $3k–$5k es razonable con 2–4 clientes pequeños.',
    bloques: [
      {
        titulo: 'Semana 1 — Volumen',
        items: [
          { id: 's1-10dia', texto: '10 contactos nuevos al día, 5 días (50 en total)' },
          { id: 's1-crm', texto: 'Todos registrados en el CRM con fecha de seguimiento' },
          { id: 's1-entrega', texto: 'Si tienes cliente: entrega antes de la fecha prometida' },
          { id: 's1-testimonio', texto: 'Pide testimonio (texto o video de 20 s) al primer cliente' },
        ],
      },
      {
        titulo: 'Semana 2 — Mejorar la oferta',
        items: [
          { id: 's2-metricas', texto: 'Calcula tu tasa de respuesta: respuestas ÷ mensajes', detalle: 'Si es menor a 10%, cambia la primera línea y la prueba gratis del mensaje.' },
          { id: 's2-ajusta', texto: 'Ajusta tu mensaje con lo aprendido y prueba 2 versiones' },
          { id: 's2-portafolio', texto: 'Agrega el trabajo real del cliente a tu portafolio' },
          { id: 's2-referidos', texto: 'Pide 2 referidos a cada cliente satisfecho' },
        ],
      },
      {
        titulo: 'Semana 3 — Cerrar más',
        items: [
          { id: 's3-objeciones', texto: 'Practica respuestas a las 5 objeciones (ver Protocolo de prospección)' },
          { id: 's3-anticipo', texto: 'Cobra 50% de anticipo en todos los trabajos nuevos' },
          { id: 's3-paquete', texto: 'Crea un paquete de 3 niveles (básico, recomendado, completo)' },
          { id: 's3-visitas', texto: 'Haz 5 visitas en persona o llamadas (convierten más que el chat)' },
        ],
      },
      {
        titulo: 'Semana 4 — Consolidar',
        items: [
          { id: 's4-registro', texto: 'Todos tus ingresos registrados en el Centro Financiero' },
          { id: 's4-dinero', texto: 'Aplica el Protocolo de dinero a cada peso que entró' },
          { id: 's4-recurrente', texto: 'Ofrece a cada cliente un servicio mensual o de seguimiento' },
          { id: 's4-revision', texto: 'Revisión del mes: ¿qué canal trajo clientes? Duplica eso el mes siguiente' },
          { id: 's4-meta', texto: 'Meta: $3,000–$5,000 MXN acumulados (o al menos 3 clientes pagando)' },
        ],
      },
    ],
    notas: [
      'Números de referencia (muy variables): de 100 mensajes en frío suelen responder 5–15 y cerrar 1–4. Con referidos la tasa es mucho mayor.',
      'Si un mes completo de esfuerzo real no trae ningún cliente, cambia la oferta o el tipo de cliente — no necesariamente la ruta.',
    ],
  },
  {
    id: '90-dias',
    nombre: 'Protocolo 90 días',
    objetivo: 'Ingreso recurrente y primeros clientes fijos: 2–5 clientes que pagan cada mes.',
    duracion: '3 meses',
    intro:
      'El ingreso que se repite cada mes cambia todo: te permite planear, ahorrar y subir precios sin miedo. En 90 días pasas de "hago trabajitos" a "tengo clientes".',
    bloques: [
      {
        titulo: 'Mes 1 — Base',
        items: [
          { id: 'm1-30', texto: 'Completa el Protocolo 30 días' },
          { id: 'm1-mensual', texto: 'Diseña tu servicio mensual (qué incluye cada mes, precio, contrato mínimo de 3 meses)' },
          { id: 'm1-contrato', texto: 'Plantilla de acuerdo simple: alcance, pagos, cambios, cancelación' },
        ],
      },
      {
        titulo: 'Mes 2 — Recurrencia',
        items: [
          { id: 'm2-2fijos', texto: 'Consigue 2 clientes con pago mensual' },
          { id: 'm2-proceso', texto: 'Documenta tu proceso de entrega paso a paso (checklist propio)' },
          { id: 'm2-plantillas', texto: 'Crea plantillas reutilizables para entregar más rápido' },
          { id: 'm2-precio', texto: 'Sube 20% el precio a clientes nuevos' },
        ],
      },
      {
        titulo: 'Mes 3 — Sistema',
        items: [
          { id: 'm3-5fijos', texto: '3–5 clientes recurrentes (estimación de $4,000–$12,000/mes según ruta)' },
          { id: 'm3-casos', texto: 'Publica 2 casos de estudio con resultados reales' },
          { id: 'm3-fondo', texto: 'Fondo de emergencia inicial completo ($5,000)' },
          { id: 'm3-rfc', texto: 'Revisa la guía de formalización: ¿ya te conviene sacar RFC?' },
          { id: 'm3-nivel', texto: 'Revisa la Escalera: ¿qué necesitas para el siguiente nivel?' },
        ],
      },
    ],
  },
  {
    id: 'prospeccion',
    nombre: 'Protocolo de prospección',
    objetivo: 'Generar conversaciones con clientes todos los días sin quemar tu reputación.',
    duracion: 'Diario · 45–60 min',
    intro:
      'La prospección es el motor. Sin conversaciones no hay ventas. Hazla como hábito diario a la misma hora, antes de cualquier otra tarea del negocio.',
    bloques: [
      {
        titulo: 'Rutina diaria',
        items: [
          { id: 'p-10', texto: '10 contactos nuevos personalizados (mínimo 5 en días de exámenes)', detalle: 'Personalizar = mencionar algo real de su negocio en la primera línea.' },
          { id: 'p-seg', texto: 'Seguimientos pendientes del CRM (los que vencen hoy)' },
          { id: 'p-registro', texto: 'Registrar todo en el CRM con estado y fecha del siguiente paso' },
          { id: 'p-contenido', texto: '1 publicación o historia mostrando tu trabajo (alimenta la prospección pasiva)' },
        ],
      },
      {
        titulo: 'Reglas de seguimiento',
        items: [
          { id: 'p-r1', texto: 'Seguimiento 1: a los 3 días ("¿pudo ver el ejemplo?")' },
          { id: 'p-r2', texto: 'Seguimiento 2: a los 7 días con algo de valor (un tip, un dato)' },
          { id: 'p-r3', texto: 'Después de 2 seguimientos sin respuesta, pausa 60 días. No insistas más.' },
          { id: 'p-r4', texto: 'Si alguien dice "no me interesa": agradece, no discutas, márcalo en el CRM.' },
        ],
      },
      {
        titulo: 'Manejo de objeciones (practica las respuestas)',
        items: [
          { id: 'p-o1', texto: '"Está muy caro" → "Entiendo. ¿Comparado con qué? Lo que más le importa es [resultado]; podemos empezar con el paquete básico."' },
          { id: 'p-o2', texto: '"Déjame pensarlo" → "Claro. ¿Qué es lo que le genera duda? Así le mando la información exacta."' },
          { id: 'p-o3', texto: '"Eres muy joven" → "Sí, y por eso uso las herramientas más nuevas. Aquí está el trabajo que hice para [cliente]. Le cobro anticipo solo del 50%, así el riesgo es compartido."' },
          { id: 'p-o4', texto: '"Mi sobrino me lo hace" → "Perfecto. Si algún día necesita algo con fecha de entrega y garantía, aquí estoy."' },
          { id: 'p-o5', texto: '"Ya tengo a alguien" → "Qué bien. Si en algún momento quiere una segunda opinión gratis, con gusto."' },
        ],
      },
      {
        titulo: 'Cierre',
        items: [
          { id: 'p-c1', texto: 'Siempre termina con una pregunta concreta y fácil de responder ("¿Lo empezamos el lunes?")' },
          { id: 'p-c2', texto: 'Manda propuesta por escrito el mismo día: qué incluye, precio, fecha, forma de pago' },
          { id: 'p-c3', texto: 'Cobra anticipo para apartar fecha' },
        ],
      },
    ],
    notas: [
      'Nunca hagas spam masivo, compres bases de datos ni mandes mensajes automatizados a desconocidos: WhatsApp bloquea números y daña tu reputación.',
      'Respeta a quien dice que no. En una ciudad como Ags, todos se conocen.',
    ],
  },
  {
    id: 'precios',
    nombre: 'Protocolo de precios',
    objetivo: 'Cotizar con confianza, cobrar anticipo y subir precios en el momento correcto.',
    duracion: 'Cada cotización',
    intro:
      'Cobrar barato no te hace más competitivo: te hace estar más cansado. El precio comunica calidad. Empiezas accesible para conseguir testimonios y subes de forma sistemática.',
    bloques: [
      {
        titulo: 'Antes de cotizar',
        items: [
          { id: 'pr-1', texto: 'Pregunta qué resultado busca y cuánto vale para su negocio (un cliente nuevo, horas ahorradas)' },
          { id: 'pr-2', texto: 'Calcula tu piso: horas estimadas × $150 (mínimo que aceptas por hora al inicio)' },
          { id: 'pr-3', texto: 'Revisa el rango sugerido de la ficha de la idea' },
        ],
      },
      {
        titulo: 'Cómo cotizar',
        items: [
          { id: 'pr-4', texto: 'Ofrece 3 opciones (básico, recomendado, completo); la mayoría elige la de en medio' },
          { id: 'pr-5', texto: 'Precio cerrado por entregable, no por hora' },
          { id: 'pr-6', texto: 'Especifica qué incluye, qué no, rondas de cambios y fecha de entrega' },
          { id: 'pr-7', texto: 'Anticipo del 50% (100% en trabajos menores a $1,000)' },
          { id: 'pr-8', texto: 'Formas de pago claras: transferencia, depósito o efectivo con recibo' },
        ],
      },
      {
        titulo: 'Cuándo subir',
        items: [
          { id: 'pr-9', texto: 'Después de cada 3 clientes cerrados: +20–30% a clientes nuevos' },
          { id: 'pr-10', texto: 'Si más del 80% acepta sin dudar: estás barato' },
          { id: 'pr-11', texto: 'Si tienes más trabajo del que puedes hacer: sube precio antes de contratar' },
          { id: 'pr-12', texto: 'Clientes actuales: avisa con 30 días y mantén precio especial a los primeros' },
        ],
      },
    ],
    notas: ['Nunca bajes el precio sin quitar algo del alcance. "Puedo hacerlo por menos si quitamos X".'],
  },
  {
    id: 'entrega',
    nombre: 'Protocolo de entrega',
    objetivo: 'Entregar con calidad y a tiempo para convertir clientes en testimonios y referidos.',
    duracion: 'Cada proyecto',
    intro:
      'La manera más barata de conseguir clientes es que tus clientes actuales hablen bien de ti. Eso solo pasa si la experiencia completa (no solo el resultado) es excelente.',
    bloques: [
      {
        titulo: 'Inicio',
        items: [
          { id: 'e-1', texto: 'Confirmación por escrito: qué, cuándo, cuánto, anticipo recibido' },
          { id: 'e-2', texto: 'Pide todo el material en un solo mensaje con lista (logo, fotos, accesos, textos)' },
          { id: 'e-3', texto: 'Define un solo canal de comunicación y horario de respuesta' },
        ],
      },
      {
        titulo: 'Durante',
        items: [
          { id: 'e-4', texto: 'Promete fecha con colchón (si tardas 3 días, promete 5) y entrega antes' },
          { id: 'e-5', texto: 'Avance a mitad del proyecto (evita sorpresas)' },
          { id: 'e-6', texto: 'Revisión de calidad propia con checklist antes de enviar' },
        ],
      },
      {
        titulo: 'Cierre',
        items: [
          { id: 'e-7', texto: 'Entrega organizada: archivos, accesos, instrucciones' },
          { id: 'e-8', texto: 'Cobra el saldo al entregar' },
          { id: 'e-9', texto: 'Pide testimonio a los 3–7 días: "¿Me ayudas con 2 líneas de cómo te fue?"' },
          { id: 'e-10', texto: 'Pide 2 referidos concretos: "¿Conoces a 2 negocios a los que les sirva?"' },
          { id: 'e-11', texto: 'Agenda seguimiento a 30 días en el CRM (oportunidad de venta recurrente)' },
        ],
      },
    ],
  },
  {
    id: 'dinero',
    nombre: 'Protocolo de dinero',
    objetivo: 'Qué hacer con cada peso que entra.',
    duracion: 'Cada ingreso',
    intro:
      'El dinero que no tiene destino desaparece. Reparte CADA ingreso en el momento en que llega, antes de gastar. Los porcentajes son una guía para alguien que vive con su familia y no paga renta; ajústalos a tu realidad.',
    bloques: [
      {
        titulo: 'Reparto de cada ingreso (etapa inicial)',
        items: [
          { id: 'dn-1', texto: '40% Reinversión: herramientas, cursos que sí necesitas, inventario', detalle: 'Solo compras que aumenten tu capacidad de ganar.' },
          { id: 'dn-2', texto: '30% Fondo de emergencia hasta completarlo ($5,000 → luego 3 meses de tus gastos)' },
          { id: 'dn-3', texto: '15% Ahorro/inversión de largo plazo (después del fondo de emergencia)' },
          { id: 'dn-4', texto: '15% Gastar en lo que quieras sin culpa', detalle: 'Si no te premias nunca, abandonas el plan.' },
        ],
      },
      {
        titulo: 'Reglas',
        items: [
          { id: 'dn-5', texto: 'Cuenta separada para el negocio (una cuenta digital sin comisiones sirve)' },
          { id: 'dn-6', texto: 'Registra cada ingreso y gasto en el Centro Financiero el mismo día' },
          { id: 'dn-7', texto: 'Separa un % para impuestos cuando te formalices (pregunta a un contador cuánto)' },
          { id: 'dn-8', texto: 'Cero deudas para "invertir" o para consumo' },
          { id: 'dn-9', texto: 'Si ayudas en casa, decide un monto fijo mensual y respétalo' },
        ],
      },
      {
        titulo: 'Cuando ganes más (Nivel 3+)',
        items: [
          { id: 'dn-10', texto: 'Págate un "sueldo" fijo mensual y deja el resto en el negocio' },
          { id: 'dn-11', texto: 'Fondo de emergencia de 3–6 meses de gastos' },
          { id: 'dn-12', texto: 'Inversión de bajo riesgo para tu ahorro (lee la sección de educación financiera)' },
        ],
      },
    ],
  },
  {
    id: 'semana-estudiante',
    nombre: 'Protocolo de semana de estudiante',
    objetivo: 'Combinar prepa, trabajo profundo, aprendizaje, ejercicio y descanso sin abandonar nada.',
    duracion: 'Semana modelo',
    intro:
      'La prepa no es negociable: es tu red de seguridad y tus opciones futuras. Este horario modelo asume clases de 7:00 a 14:00; ajústalo al tuyo. Total aproximado: 15–20 h/semana para el negocio.',
    bloques: [
      {
        titulo: 'Lunes a viernes',
        items: [
          { id: 'w-1', texto: '6:00–6:45 · Ejercicio o caminar + desayuno (sin celular)' },
          { id: 'w-2', texto: '7:00–14:00 · Escuela (atención real: es tu trabajo principal hoy)' },
          { id: 'w-3', texto: '14:00–15:30 · Comida y descanso real' },
          { id: 'w-4', texto: '15:30–17:00 · Tareas escolares (primero lo de la escuela)' },
          { id: 'w-5', texto: '17:00–19:00 · Trabajo profundo del negocio (celular en modo no molestar)', detalle: 'Primera media hora: prospección. Resto: entregas.' },
          { id: 'w-6', texto: '19:00–19:45 · Aprendizaje de habilidad (Biblioteca)' },
          { id: 'w-7', texto: '19:45–21:30 · Familia, amigos, libre' },
          { id: 'w-8', texto: '21:30–22:00 · Revisar tareas de mañana, sin pantallas después' },
          { id: 'w-9', texto: '22:00–6:00 · Dormir 8 horas (no negociable a tu edad)' },
        ],
      },
      {
        titulo: 'Sábado',
        items: [
          { id: 'w-10', texto: '9:00–13:00 · Bloque largo: entregas, visitas a negocios, sesiones de fotos' },
          { id: 'w-11', texto: 'Tarde libre' },
        ],
      },
      {
        titulo: 'Domingo',
        items: [
          { id: 'w-12', texto: '1 hora: Revisión semanal en el Diario y plan de la semana' },
          { id: 'w-13', texto: 'Resto: descanso total, familia, deporte' },
        ],
      },
      {
        titulo: 'Semanas de exámenes',
        items: [
          { id: 'w-14', texto: 'Reduce el negocio a 1 h diaria (solo entregas comprometidas y seguimientos)' },
          { id: 'w-15', texto: 'Avisa a clientes con anticipación y no aceptes proyectos nuevos esa semana' },
        ],
      },
    ],
  },
  {
    id: 'anti-burnout',
    nombre: 'Protocolo anti-burnout',
    objetivo: 'Sacrificar comodidad sin destruir tu salud, tus estudios ni tus relaciones.',
    duracion: 'Revisión semanal',
    intro:
      'El sacrificio es bueno; quemarse destruye el plan. La riqueza se construye en años, así que necesitas un ritmo que puedas sostener años. El burnout no se ve venir: se mide.',
    bloques: [
      {
        titulo: 'Señales de alerta (si marcas 2 o más, baja el ritmo)',
        items: [
          { id: 'b-1', texto: 'Duermes menos de 7 horas más de 3 noches por semana' },
          { id: 'b-2', texto: 'Tus calificaciones bajaron' },
          { id: 'b-3', texto: 'Te irritas fácil con tu familia o amigos' },
          { id: 'b-4', texto: 'Ya no disfrutas nada, ni el dinero que ganas' },
          { id: 'b-5', texto: 'Dejaste el ejercicio por completo' },
          { id: 'b-6', texto: 'Sientes ansiedad constante al ver el celular' },
        ],
      },
      {
        titulo: 'Reglas de protección',
        items: [
          { id: 'b-7', texto: 'Un día completo a la semana sin trabajo del negocio' },
          { id: 'b-8', texto: 'Dormir 8 h es parte del plan, no un lujo' },
          { id: 'b-9', texto: 'Ejercicio mínimo 3 veces por semana (aunque sea caminar 30 min)' },
          { id: 'b-10', texto: 'No contestar clientes después de las 21:00' },
          { id: 'b-11', texto: 'Máximo de clientes activos según tus horas reales (no aceptes de más: sube precio)' },
          { id: 'b-12', texto: 'Una semana ligera cada 6–8 semanas' },
        ],
      },
      {
        titulo: 'Si ya estás quemado',
        items: [
          { id: 'b-13', texto: 'Pausa proyectos nuevos 1–2 semanas; termina solo lo comprometido' },
          { id: 'b-14', texto: 'Habla con alguien de confianza (familia, orientador escolar)' },
          { id: 'b-15', texto: 'Si la tristeza o ansiedad dura semanas, busca ayuda profesional. En México puedes llamar a la Línea de la Vida: 800 911 2000 (gratuita, 24 h).' },
        ],
      },
    ],
  },
]
