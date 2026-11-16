export interface Guion {
  id: string
  categoria: 'contacto' | 'seguimiento' | 'caro' | 'cierre' | 'referidos' | 'testimonios' | 'cobranza' | 'reactivar'
  titulo: string
  cuando: string
  texto: string
}

export const CATEGORIAS_GUION: Record<Guion['categoria'], string> = {
  contacto: 'Primer contacto',
  seguimiento: 'Seguimiento',
  caro: '"Está caro"',
  cierre: 'Cierre',
  referidos: 'Pedir referidos',
  testimonios: 'Pedir testimonios',
  cobranza: 'Cobranza amable',
  reactivar: 'Reactivar clientes',
}

export const GUIONES: Guion[] = [
  { id: 'c1', categoria: 'contacto', titulo: 'Con muestra especulativa', cuando: 'Negocio que no conoces; ya le hiciste un ejemplo.', texto: 'Hola, buen día 👋 Soy [Tu nombre], de LKM\'r, aquí en Jesús María. Vi que [observación concreta de su negocio]. Le preparé un ejemplo de cómo podría verse [lo que haces], sin compromiso: [link]. ¿Le puedo platicar en 2 minutos cómo funcionaría?' },
  { id: 'c2', categoria: 'contacto', titulo: 'Diagnóstico gratis', cuando: 'Para abrir conversación sin vender de entrada.', texto: 'Hola [Nombre], hago diagnósticos de presencia digital para negocios de Aguascalientes. En 24 h le mando un resumen de 1 página con lo que le falta en Google, redes y WhatsApp, y lo que yo arreglaría primero. Sin costo. ¿Se lo preparo?' },
  { id: 'c3', categoria: 'contacto', titulo: 'Conocido / recomendado', cuando: 'Alguien te lo recomendó o es conocido de tu familia.', texto: 'Hola [Nombre], ¿cómo está? Soy [Tu nombre], [hijo/sobrino/amigo] de [conexión]. Me comentó que tiene [negocio]. Me dedico a [servicio] para negocios de la zona y me encantaría ayudarle. ¿Le puedo mostrar un par de ideas para su negocio esta semana?' },
  { id: 's1', categoria: 'seguimiento', titulo: 'Seguimiento a 3 días', cuando: 'No contestó el primer mensaje.', texto: 'Hola [Nombre], le escribo de nuevo por si se le pasó mi mensaje. ¿Alcanzó a ver el ejemplo que le preparé? Si no es buen momento, con toda confianza dígame y no le insisto 🙌' },
  { id: 's2', categoria: 'seguimiento', titulo: 'Seguimiento con valor (7 días)', cuando: 'Segundo y último seguimiento.', texto: 'Hola [Nombre], un dato que le puede servir aunque no trabajemos juntos: [tip concreto, ej. "en su ficha de Google falta el horario del sábado"]. Si en algún momento quiere que lo resolvamos, aquí estoy.' },
  { id: 's3', categoria: 'seguimiento', titulo: 'Después de cotizar', cuando: 'Le mandaste propuesta y no ha respondido.', texto: 'Hola [Nombre], ¿pudo revisar la propuesta? Si quiere, la ajustamos a lo que más le urge o lo dividimos en dos etapas. ¿Qué es lo que le genera duda?' },
  { id: 'p1', categoria: 'caro', titulo: 'Reencuadrar el valor', cuando: '"Está muy caro."', texto: 'Le entiendo. Pensémoslo así: si esto le trae [1 cliente/mes] y un cliente le deja [$X], se paga en [tiempo]. Además queda a su nombre y es para siempre. ¿Qué le parece si empezamos con la parte que más impacto tiene y dejamos lo demás para después?' },
  { id: 'p2', categoria: 'caro', titulo: 'Bajar alcance, no precio', cuando: 'Quiere descuento.', texto: 'Puedo ajustarlo, pero para mantener la calidad prefiero quitar algo en lugar de bajar el precio. Por ejemplo, sin [elemento], quedaría en $[precio menor]. ¿Así le acomoda mejor?' },
  { id: 'k1', categoria: 'cierre', titulo: 'Cierre por fecha', cuando: 'Mostró interés claro.', texto: 'Perfecto. Para arrancar solo necesito el 50% de anticipo y la información que le paso en una lista. Si lo confirmamos hoy, se lo entrego el [día]. ¿Le mando los datos para el depósito?' },
  { id: 'k2', categoria: 'cierre', titulo: 'Cierre por alternativa', cuando: 'Duda entre opciones.', texto: 'Por lo que me cuenta, le recomiendo el paquete [recomendado] porque [razón]. Si prefiere empezar más ligero, el [básico] también funciona. ¿Con cuál arrancamos?' },
  { id: 'r1', categoria: 'referidos', titulo: 'Referidos al entregar', cuando: 'Cliente contento, recién entregado.', texto: 'Me da mucho gusto que le haya gustado 🙌 Una pregunta: ¿conoce a 2 negocios a los que también les serviría? Si me pasa su contacto, a usted le [beneficio: mes de mantenimiento gratis / descuento en su próximo servicio].' },
  { id: 'r2', categoria: 'referidos', titulo: 'Mensaje para que reenvíe', cuando: 'Te dijo que sí conoce a alguien.', texto: '¡Gracias! Si quiere, reenvíele esto: "Te recomiendo a [Tu nombre] de LKM\'r, me hizo [servicio] y quedó muy bien. Su WhatsApp: [número]".' },
  { id: 't1', categoria: 'testimonios', titulo: 'Pedir testimonio escrito', cuando: '3–7 días después de entregar.', texto: '¡Hola [Nombre]! ¿Cómo le ha funcionado [servicio]? Si me ayuda con 2 o 3 líneas de cómo le fue trabajar conmigo, me ayuda muchísimo para que otros negocios confíen. ¿Me da permiso de publicarlo con su nombre y negocio?' },
  { id: 't2', categoria: 'testimonios', titulo: 'Testimonio en video', cuando: 'Cliente muy satisfecho.', texto: '¿Me regalaría un video de 20 segundos contando qué necesitaba y cómo le quedó? Puede ser con su celular, sin producción. Le mando 3 preguntas guía para que sea fácil.' },
  { id: 'b1', categoria: 'cobranza', titulo: 'Recordatorio de saldo', cuando: 'El cliente aprobó pero no ha pagado el saldo.', texto: 'Hola [Nombre], qué gusto que quedó listo [proyecto]. Le comparto los datos para el 50% restante ($[monto]). En cuanto se refleje le entrego todos los accesos y la guía. ¡Gracias!' },
  { id: 'a1', categoria: 'reactivar', titulo: 'Cliente de hace meses', cuando: 'Trabajaste con él hace 2+ meses.', texto: 'Hola [Nombre], ¿cómo va [negocio]? Me acordé de usted porque [novedad relevante: ej. Google cambió algo / temporada que viene]. ¿Le gustaría que revisemos cómo está su [servicio] y qué podríamos mejorar para [temporada]?' },
]
