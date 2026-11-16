import type { NivelEscalera } from '../types'

export const ESCALERA: NivelEscalera[] = [
  {
    nivel: 1,
    nombre: 'Primer peso',
    meta: 'Que alguien te pague por primera vez por algo que hiciste.',
    umbral: 1,
    enfoque: 'Validar que puedes vender.',
    queCambia: ['Pasas de "quiero emprender" a "ya vendí".', 'Aprendes que vender es pedir, no rogar.'],
    hacer: ['Protocolo Día 0–7.', 'Una sola ruta.', '20+ contactos.', 'Cobra aunque sea poco.'],
    desbloquea: ['Confianza real.', 'Primer testimonio.', 'Protocolo 30 días.'],
    formalizacion: 'No es necesaria todavía. Registra todo en el Centro Financiero desde el primer peso.',
    peligro: 'Quedarte "preparándote" semanas sin contactar a nadie.',
  },
  {
    nivel: 2,
    nombre: '$5k al mes',
    meta: '$5,000 MXN en un mes (estimación referencial).',
    umbral: 5000,
    enfoque: 'Repetir la venta: sistema de prospección diaria.',
    queCambia: ['Ya no dependes de suerte: tienes un proceso.', 'Empiezas a subir precios.'],
    hacer: ['Protocolo 30 días.', 'Prospección diaria.', 'Fondo de emergencia de $5,000.', 'Portafolio con trabajos reales.'],
    desbloquea: ['Servicios recurrentes.', 'Ideas de nivel 2 del catálogo (ej. celulares usados, redes WiFi).'],
    formalizacion: 'Empieza a informarte sobre RFC y regímenes. Si clientes te piden factura, es momento de sacar RFC (verifica con el SAT o un contador).',
    peligro: 'Gastarte todo en ropa/gadgets el primer mes bueno.',
  },
  {
    nivel: 3,
    nombre: '$15k al mes',
    meta: '$15,000 MXN al mes de forma estable (3 meses seguidos).',
    umbral: 15000,
    enfoque: 'Recurrencia y precios más altos.',
    queCambia: ['Clientes fijos con pago mensual.', 'Tu tiempo se vuelve escaso: empiezas a decir que no.', 'Plantillas y procesos documentados.'],
    hacer: ['Protocolo 90 días.', 'Subir precios.', 'Nicho claro.', 'Primeras automatizaciones internas.'],
    desbloquea: ['Micro-SaaS, cursos, agentes de IA (nivelMin 3).', 'Primer colaborador por proyecto.'],
    formalizacion: 'Muy probablemente ya debes estar inscrito en el RFC y facturando. Habla con un contador sobre el régimen que te conviene (p. ej. RESICO o actividades empresariales/plataformas).',
    peligro: 'Aceptar todo trabajo y descuidar la escuela o el sueño.',
  },
  {
    nivel: 4,
    nombre: '$30k al mes',
    meta: '$30,000 MXN al mes.',
    umbral: 30000,
    enfoque: 'Delegar producción.',
    queCambia: ['Pagas a otros por tareas que no requieren tu criterio.', 'Tu trabajo es vender, revisar calidad y mejorar el sistema.'],
    hacer: ['Contratar freelancers por proyecto.', 'Márgenes por cliente.', 'Contratos formales.', 'Fondo de 3 meses.'],
    desbloquea: ['Agencia digital, e-commerce con marca (nivelMin 4).'],
    formalizacion: 'Contador fijo, facturación ordenada, contratos con clientes y colaboradores.',
    peligro: 'Contratar antes de tener flujo estable o sin márgenes claros.',
  },
  {
    nivel: 5,
    nombre: '$60k al mes con sistemas',
    meta: '$60,000 MXN al mes con equipo y procesos.',
    umbral: 60000,
    enfoque: 'El negocio funciona sin que hagas todo.',
    queCambia: ['Equipo fijo pequeño.', 'Procesos escritos.', 'Métricas semanales.'],
    hacer: ['Primer empleado fijo con reserva de 3 meses de nómina.', 'Líder de producción.', 'Sistema de ventas repetible.'],
    desbloquea: ['SaaS vertical, empresa de TI (nivelMin 5).'],
    formalizacion: 'Valora con contador y abogado constituir persona moral; obligaciones patronales (IMSS, etc.) si tienes empleados.',
    peligro: 'Crecer en costos fijos más rápido que en ingresos.',
  },
  {
    nivel: 6,
    nombre: '$100k+ al mes y activos',
    meta: '$100,000+ MXN al mes y activos que generan sin tu tiempo.',
    umbral: 100000,
    enfoque: 'Construir activos: software, marca, participaciones.',
    queCambia: ['Tus ingresos ya no dependen de tus horas.', 'Empiezas a asignar capital.'],
    hacer: ['Productos propios.', 'Inversión diversificada.', 'Participaciones en negocios (con asesoría).'],
    desbloquea: ['Inversión en negocios locales (nivelMin 6).'],
    formalizacion: 'Estructura fiscal y legal con profesionales. Separación total de patrimonio personal y empresarial.',
    peligro: 'Ego y gastos de estatus. Invertir en lo que no entiendes.',
  },
  {
    nivel: 7,
    nombre: 'Inversión y libertad financiera',
    meta: 'Que tus inversiones cubran tus gastos.',
    umbral: 250000,
    enfoque: 'Proteger y hacer crecer el patrimonio.',
    queCambia: ['Trabajas porque quieres, no porque debes.', 'Tu prioridad es no perder.'],
    hacer: ['Portafolio diversificado y aburrido.', 'Asesoría financiera profesional independiente.', 'Ayudar a otros a subir la escalera.'],
    desbloquea: ['Libertad de elegir en qué usar tu tiempo.'],
    formalizacion: 'Planeación patrimonial con profesionales.',
    peligro: 'Perderlo todo por una sola apuesta grande.',
  },
]

export const nivelActual = (ingresoMes: number, totalHistorico: number) => {
  let n = 0
  for (const e of ESCALERA) {
    if (e.nivel === 1 ? totalHistorico >= 1 : ingresoMes >= e.umbral) n = e.nivel
  }
  return n
}
