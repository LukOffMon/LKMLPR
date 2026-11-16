import type { Diagnostico, Idea } from '../types'
import { IDEAS } from './ideas'

export const OPC_HABILIDADES = [
  { id: 'tecnologia', label: 'Arreglar/armar computadoras' },
  { id: 'programacion', label: 'Programar o hacer páginas' },
  { id: 'diseno', label: 'Diseño (Canva, Figma, Photoshop)' },
  { id: 'video', label: 'Editar video' },
  { id: 'foto', label: 'Tomar buenas fotos' },
  { id: 'redes', label: 'Manejar redes sociales' },
  { id: 'escritura', label: 'Escribir bien' },
  { id: 'ensenar', label: 'Explicar / enseñar' },
  { id: 'matematicas', label: 'Matemáticas / ciencias' },
  { id: 'ventas', label: 'Convencer / vender' },
  { id: 'organizacion', label: 'Organizar y administrar' },
  { id: 'ia', label: 'Usar IA (Claude, etc.) a fondo' },
]

export const OPC_INTERESES = [
  { id: 'tecnologia', label: 'Hardware y tecnología' },
  { id: 'gaming', label: 'Videojuegos' },
  { id: 'programacion', label: 'Software y apps' },
  { id: 'contenido', label: 'Crear contenido' },
  { id: 'negocios', label: 'Negocios y empresas' },
  { id: 'comercio', label: 'Comprar y vender' },
  { id: 'diseno', label: 'Arte y diseño' },
  { id: 'ensenar', label: 'Educación' },
  { id: 'ia', label: 'Inteligencia artificial' },
]

export const OPC_CONTACTOS = [
  { id: 'negocios', label: 'Familiares o conocidos con negocio' },
  { id: 'profesionistas', label: 'Conozco doctores, contadores, abogados' },
  { id: 'escuela', label: 'Red grande en la escuela' },
  { id: 'industria', label: 'Familia que trabaja en la industria/empresas' },
  { id: 'ninguno', label: 'Casi no tengo contactos útiles' },
]

export interface Recomendacion {
  idea: Idea
  puntaje: number
  razones: string[]
}

/** Calcula las rutas más compatibles con el perfil. Solo considera ideas aptas para empezar desde cero. */
export const recomendar = (d: Diagnostico, n = 3): Recomendacion[] => {
  const horas = d.horasSemana + d.horasFinde
  const res: Recomendacion[] = IDEAS.filter((i) => (i.nivelMin ?? 1) <= 1).map((idea) => {
    let p = 0
    const razones: string[] = []
    const hab = idea.tags.filter((t) => d.habilidades.includes(t))
    const int = idea.tags.filter((t) => d.intereses.includes(t))
    p += hab.length * 3 + int.length * 2
    if (hab.length) razones.push('Usa habilidades que ya tienes.')
    if (int.length) razones.push('Va con lo que te interesa.')

    const presencial = idea.modalidad === 'local' || idea.tags.includes('presencial')
    if (presencial) {
      if (d.ventas >= 4) { p += 2; razones.push('Te sientes cómodo hablando con gente: lo local te conviene.') }
      if (d.ventas <= 2) p -= 3
      if (d.transporte === 'ninguno' && idea.modalidad === 'local') p -= 3
      if (d.transporte !== 'ninguno' && idea.modalidad === 'local') p += 1
    } else if (d.ventas <= 2) {
      p += 2
      razones.push('Se puede vender por mensaje, sin tanto trato en persona.')
    }

    if (d.contactos.includes('negocios') && idea.categoria === 'local') { p += 3; razones.push('Tus contactos con negocios son clientes potenciales.') }
    if (d.contactos.includes('profesionistas') && ['agendas-online', 'google-business', 'landing-pages', 'chatbot-whatsapp'].includes(idea.id)) { p += 2; razones.push('Conoces profesionistas que lo necesitan.') }
    if (d.contactos.includes('escuela') && ['asesorias', 'pc-gamer', 'mantenimiento-pc', 'temporada', 'formateo'].includes(idea.id)) { p += 2; razones.push('Tu red escolar es tu primer mercado.') }
    if (d.contactos.includes('industria') && ['soporte-pymes', 'automatizaciones', 'traduccion', 'landing-pages'].includes(idea.id)) p += 1

    if (idea.tags.includes('ingles')) {
      if (d.ingles === 'avanzado') { p += 3; razones.push('Tu inglés abre clientes que pagan más.') }
      if (d.ingles === 'basico' && idea.id === 'traduccion') p -= 8
    }

    if (horas < 10) {
      p -= idea.dificultad - 2
      if (idea.diasPrimerPeso[0] <= 7) { p += 2; razones.push('Rápido al primer peso con pocas horas.') }
    } else if (horas >= 20 && idea.escalabilidad >= 4) {
      p += 2
      razones.push('Tienes horas para algo más escalable.')
    }

    // Preferir dinero rápido al inicio
    p += Math.max(0, 3 - Math.floor(idea.diasPrimerPeso[0] / 10))
    p += idea.escalabilidad * 0.5
    return { idea, puntaje: p, razones: [...new Set(razones)].slice(0, 3) }
  })
  // Máximo 2 rutas de la misma categoría, para que puedas comparar caminos distintos.
  const orden = res.sort((a, b) => b.puntaje - a.puntaje)
  const elegidas: Recomendacion[] = []
  for (const r of orden) {
    if (elegidas.length >= n) break
    if (elegidas.filter((x) => x.idea.categoria === r.idea.categoria).length >= 2) continue
    elegidas.push(r)
  }
  return elegidas
}

export const perfilEmprendedor = (d: Diagnostico) => {
  const horas = d.horasSemana + d.horasFinde
  const tecnico = ['programacion', 'tecnologia', 'ia'].filter((x) => d.habilidades.includes(x)).length
  const creativo = ['diseno', 'video', 'foto', 'redes', 'escritura'].filter((x) => d.habilidades.includes(x)).length
  const social = d.ventas + (d.habilidades.includes('ensenar') ? 1 : 0) + (d.habilidades.includes('ventas') ? 1 : 0)

  let arquetipo = 'El Constructor'
  let descripcion = 'Disciplinado y con ganas. Tu ventaja será la constancia: elige una ruta sencilla y repítela hasta dominarla.'
  if (tecnico >= 2 && social >= 4) {
    arquetipo = 'El Técnico Vendedor'
    descripcion = 'Combinas habilidad técnica con trato con la gente: la mezcla más rara y valiosa. Puedes vender soluciones a negocios locales y cobrar bien.'
  } else if (tecnico >= 2) {
    arquetipo = 'El Ingeniero'
    descripcion = 'Tu fuerte es construir. Empieza vendiendo servicios técnicos por mensaje y, en la etapa 3, convierte lo que repites en software.'
  } else if (creativo >= 2 && social >= 4) {
    arquetipo = 'El Creativo Comercial'
    descripcion = 'Haces cosas bonitas y sabes venderlas. Los negocios locales necesitan exactamente eso para su presencia digital.'
  } else if (creativo >= 2) {
    arquetipo = 'El Creador'
    descripcion = 'Tu fuerte es crear contenido. Empieza como freelance en línea y construye audiencia en paralelo.'
  } else if (social >= 5) {
    arquetipo = 'El Negociante'
    descripcion = 'Hablar con gente no te cuesta. Empieza con compra-venta o servicios locales; aprende una habilidad técnica en paralelo para subir tus precios.'
  } else if (d.habilidades.includes('ensenar') || d.habilidades.includes('matematicas')) {
    arquetipo = 'El Maestro'
    descripcion = 'Sabes explicar. Las asesorías te dan dinero rápido y, más adelante, cursos y talleres.'
  }

  const ritmo =
    horas >= 20 ? 'Ritmo alto: puedes llegar al Nivel 2 en 1–3 meses si ejecutas.' : horas >= 10 ? 'Ritmo medio: realista y sostenible con la escuela.' : 'Ritmo bajo: prioriza rutas rápidas y de baja dificultad; sube horas en vacaciones.'

  const fortalezas: string[] = []
  if (tecnico) fortalezas.push('Habilidad técnica')
  if (creativo) fortalezas.push('Creatividad')
  if (d.ventas >= 4) fortalezas.push('Trato con la gente')
  if (d.ingles !== 'basico') fortalezas.push('Inglés')
  if (d.contactos.some((c) => c !== 'ninguno')) fortalezas.push('Red de contactos')
  if (horas >= 15) fortalezas.push('Tiempo disponible')
  fortalezas.push('Disciplina')

  const aMejorar: string[] = []
  if (d.ventas <= 2) aMejorar.push('Ventas y comunicación (empieza por mensaje escrito)')
  if (d.ingles === 'basico') aMejorar.push('Inglés (15 min diarios)')
  if (!tecnico) aMejorar.push('Uso avanzado de IA y una habilidad técnica')
  if (d.transporte === 'ninguno') aMejorar.push('Movilidad: prioriza servicios en línea o en tu colonia')

  return { arquetipo, descripcion, ritmo, fortalezas, aMejorar, horas }
}
