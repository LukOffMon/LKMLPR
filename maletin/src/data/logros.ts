import type { EstadoApp } from '../types'
import { calcularRacha } from '../lib/utils'
import { finSprint, ingresosEntre } from '../lib/acciones'

export interface Logro {
  id: string
  nombre: string
  desc: string
  icono: string
  /** Si no tiene `check`, se marca manualmente (hitos que la app no puede verificar). */
  check?: (e: EstadoApp) => boolean
}

const totalIngresos = (e: EstadoApp) => e.movimientos.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0)
const ganados = (e: EstadoApp) => e.leads.filter((l) => ['cerrado', 'recurrente'].includes(l.estado)).length
const mensajes = (e: EstadoApp) => Object.values(e.actividad).reduce((a, x) => a + (x.mensajes || 0), 0)

export const LOGROS: Logro[] = [
  { id: 'primer-peso', nombre: 'Primer peso', desc: 'Registraste tu primer ingreso.', icono: '🪙', check: (e) => totalIngresos(e) > 0 },
  { id: 'primer-cliente', nombre: 'Primer cliente', desc: 'Un prospecto pasó a "cerrado" en el CRM.', icono: '🤝', check: (e) => ganados(e) >= 1 },
  { id: 'mil', nombre: 'Primeros $1,000', desc: 'Acumulaste $1,000 MXN en ingresos.', icono: '💵', check: (e) => totalIngresos(e) >= 1000 },
  { id: 'diezmil', nombre: 'Primeros $10,000', desc: 'Acumulaste $10,000 MXN en ingresos.', icono: '💰', check: (e) => totalIngresos(e) >= 10000 },
  { id: 'cincuentamil', nombre: '$50,000 acumulados', desc: 'Medio camino a los $100k.', icono: '🏦', check: (e) => totalIngresos(e) >= 50000 },
  { id: 'recurrente', nombre: 'Primer cliente recurrente', desc: 'Alguien te paga cada mes.', icono: '🔁', check: (e) => e.leads.some((l) => l.estado === 'recurrente') },
  { id: 'cinco-clientes', nombre: '5 clientes', desc: 'Cinco clientes ganados en el CRM.', icono: '🖐️', check: (e) => ganados(e) >= 5 },
  { id: 'testimonio', nombre: 'Primer testimonio', desc: 'Un cliente real te dio su testimonio (márcalo tú).', icono: '⭐' },
  { id: 'referido', nombre: 'Primer referido', desc: 'Un cliente te recomendó con alguien que te contrató.', icono: '📣' },
  { id: 'sitio', nombre: 'Sitio LKM\'r publicado', desc: 'Tu sitio está en internet con tu WhatsApp.', icono: '🌐' },
  { id: 'cien-mensajes', nombre: '100 mensajes', desc: '100 mensajes de prospección registrados.', icono: '✉️', check: (e) => mensajes(e) >= 100 },
  { id: 'mil-mensajes', nombre: '1,000 mensajes', desc: 'La disciplina se nota.', icono: '📬', check: (e) => mensajes(e) >= 1000 },
  { id: 'racha7', nombre: 'Racha de 7 días', desc: 'Una semana ejecutando sin fallar.', icono: '🔥', check: (e) => calcularRacha(e.diasActivos) >= 7 },
  { id: 'racha30', nombre: 'Racha de 30 días', desc: 'Un mes completo de ejecución.', icono: '☄️', check: (e) => calcularRacha(e.diasActivos) >= 30 },
  { id: 'sprint', nombre: 'Sprint con meta lograda', desc: 'Cumpliste la meta de un sprint.', icono: '🚀', check: (e) => e.sprints.some((s) => ingresosEntre(e, s.inicio, finSprint(s)) >= s.meta) },
  { id: 'fondo', nombre: 'Fondo de emergencia inicial', desc: 'Completaste una meta de ahorro.', icono: '🛟', check: (e) => e.metas.some((m) => m.objetivo > 0 && m.actual >= m.objetivo) },
  { id: 'vision', nombre: 'Visión escrita', desc: 'Definiste tu visión a 10 años.', icono: '🧭', check: (e) => e.plan.some((p) => p.nivel === 'vision' && p.titulo.trim().length > 10) },
  { id: 'revision', nombre: 'Primera revisión semanal', desc: 'Hiciste tu primer diario semanal.', icono: '📓', check: (e) => e.diario.length > 0 },
  { id: 'activo', nombre: 'Primera inversión en activos', desc: 'Usaste el fondo de Vía Larga en un activo.', icono: '🌱', check: (e) => e.fondoLargo.some((a) => a.monto < 0) },
  { id: 'producto', nombre: 'Producto lanzado', desc: 'Un experimento del laboratorio llegó a "lanzado".', icono: '📦', check: (e) => e.productos.some((p) => p.estado === 'lanzado') },
  { id: 'foco10', nombre: '10 sesiones de enfoque', desc: '10 pomodoros completados.', icono: '⏱️', check: (e) => e.sesionesFoco.length >= 10 },
  { id: 'cotizacion', nombre: 'Primera cotización aceptada', desc: 'Una propuesta formal fue aceptada.', icono: '📄', check: (e) => e.cotizaciones.some((c) => c.estado === 'aceptada') },
]

export const logrosDesbloqueados = (e: EstadoApp) =>
  LOGROS.filter((l) => (l.check ? l.check(e) : e.logrosManuales.includes(l.id))).map((l) => l.id)
