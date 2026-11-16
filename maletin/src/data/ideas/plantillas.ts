import type { Plantillas } from '../../types'

interface Partes {
  /** Observación o problema concreto del prospecto. */
  dolor: string
  /** Qué haces tú, en una frase. */
  oferta: string
  /** Prueba o muestra gratis / de bajo riesgo. */
  prueba: string
  /** Pregunta de cierre suave (sin signos de apertura). */
  cta: string
  /** Para correo: asunto. */
  asunto: string
  /** Frase de apertura en persona (contexto del lugar). */
  enPersona?: string
}

/**
 * Arma las cuatro plantillas de prospección a partir de piezas específicas de cada idea.
 * [Corchetes] = lo personalizas tú antes de enviar. Nunca mandes el mensaje genérico.
 */
export const armarPlantillas = (p: Partes): Plantillas => ({
  whatsapp: `Hola, buen día 👋 Soy [Tu nombre], de Jesús María. Vi [algo específico de su negocio: su perfil, su local, una reseña].\n\n${p.dolor}\n\nYo ${p.oferta}. ${p.prueba}\n\n¿${p.cta}? Si no es buen momento, sin problema 🙌`,
  instagram: `¡Hola! Me gustó mucho [publicación o producto concreto] 🔥 Te escribo porque ${lower(p.dolor)}\n\n${cap(p.oferta)}. ${p.prueba}\n\n¿${p.cta}?`,
  correo: `Asunto: ${p.asunto}\n\nHola [Nombre],\n\nSoy [Tu nombre], de Aguascalientes. Revisé [su sitio/perfil/negocio] y noté lo siguiente: ${lower(p.dolor)}\n\n${cap(p.oferta)}. ${p.prueba}\n\n¿${p.cta}? Puedo adaptarme a su horario.\n\nSaludos,\n[Tu nombre]\n[WhatsApp] · [Link a portafolio]`,
  persona: `${p.enPersona ?? 'Buenas tardes, ¿se encuentra el encargado o dueño? Gracias.'} Soy [Tu nombre], vivo aquí en Jesús María. ${p.dolor} Yo ${p.oferta}. ${p.prueba} ¿${p.cta}? Le dejo mi número por WhatsApp para mandarle el ejemplo.\n\n(Tip: entra en hora tranquila — 10–12 h o 16–18 h —, nunca en hora pico. Lleva el celular con un ejemplo abierto.)`,
})

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
