export const FRASES = [
  'Hoy no se trata de ganar mucho. Se trata de mandar los 10 mensajes.',
  'La disciplina es elegir entre lo que quieres ahora y lo que más quieres.',
  'Un cliente contento vale más que cien seguidores.',
  'Nadie se hace rico rápido. Pero sí se puede empezar hoy.',
  'Primero vende servicios. Luego construye activos.',
  'Si no lo mides, no lo mejoras. Registra cada peso.',
  'Entrega antes de lo prometido. Es la publicidad más barata que existe.',
  'Tu reputación en Ags viaja más rápido que tu publicidad.',
  'Cobra anticipo. Siempre.',
  'Valida antes de construir: que alguien pague primero.',
  'Duerme 8 horas. El plan es de años, no de semanas.',
  'Sube tu precio antes de subir tus horas.',
  'Una ruta. Treinta días. Sin cambiar de idea.',
  'El "no" de hoy es información, no un fracaso.',
  'La IA no te reemplaza: te deja trabajar como un equipo.',
  'Si suena demasiado bueno para ser verdad, es una trampa.',
  'Haz que tu yo de 25 años te agradezca lo de hoy.',
  'El trabajo aburrido y constante gana al plan brillante que nunca empieza.',
  'Escuela primero, negocio después, descanso siempre.',
  'Pregunta más, habla menos. Así se vende.',
]

export const fraseDelDia = () => {
  const d = new Date()
  const n = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86_400_000)
  return FRASES[n % FRASES.length]
}
