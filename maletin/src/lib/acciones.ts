import type { Actividad, EstadoApp, Movimiento, Sprint, TipoSprint } from '../types'
import { hoyISO, uid } from './utils'

/**
 * Registra un movimiento. Si es un ingreso de Vía Rápida, aparta automáticamente
 * el % configurado al fondo de Vía Larga (regla de oro: la rápida financia a la larga).
 */
export const conMovimiento = (s: EstadoApp, m: Omit<Movimiento, 'id'>): EstadoApp => {
  const id = uid()
  const mov: Movimiento = { ...m, id, via: m.tipo === 'ingreso' ? (m.via ?? 'rapida') : undefined }
  let fondoLargo = s.fondoLargo
  if (mov.tipo === 'ingreso' && mov.via === 'rapida' && s.config.pctReinversion > 0) {
    const monto = Math.round(mov.monto * (s.config.pctReinversion / 100))
    if (monto > 0)
      fondoLargo = [...fondoLargo, { id: uid(), fecha: mov.fecha, monto, concepto: `${s.config.pctReinversion}% de "${mov.concepto}"`, origen: id }]
  }
  return { ...s, movimientos: [...s.movimientos, mov], fondoLargo }
}

export const sinMovimiento = (s: EstadoApp, id: string): EstadoApp => ({
  ...s,
  movimientos: s.movimientos.filter((x) => x.id !== id),
  fondoLargo: s.fondoLargo.filter((a) => a.origen !== id),
})

export const saldoFondo = (s: EstadoApp) => s.fondoLargo.reduce((a, x) => a + x.monto, 0)
export const apartadoTotal = (s: EstadoApp) => s.fondoLargo.filter((x) => x.monto > 0).reduce((a, x) => a + x.monto, 0)
export const invertidoEn = (s: EstadoApp, activo: string) =>
  -s.fondoLargo.filter((x) => x.activo === activo && x.monto < 0).reduce((a, x) => a + x.monto, 0)

// ── Sprints ──
export const DURACION: Record<TipoSprint, number> = { '72h': 72 * 3600e3, '7d': 7 * 86400e3, '30d': 30 * 86400e3 }

export const finSprint = (sp: Sprint) => sp.inicio + DURACION[sp.tipo]

export const sprintActivo = (s: EstadoApp) =>
  [...s.sprints].reverse().find((sp) => !sp.cerrado && Date.now() < finSprint(sp)) ?? null

export const ingresosEntre = (s: EstadoApp, desde: number, hasta: number) => {
  const a = hoyISO(new Date(desde))
  const b = hoyISO(new Date(hasta))
  return s.movimientos.filter((m) => m.tipo === 'ingreso' && m.fecha >= a && m.fecha <= b).reduce((x, m) => x + m.monto, 0)
}

export const avanceSprint = (s: EstadoApp, sp: Sprint) => ingresosEntre(s, sp.inicio, Math.min(Date.now(), finSprint(sp)))

// ── Actividad ──
export const ACT_VACIA: Actividad = { mensajes: 0, respuestas: 0, llamadas: 0, cotizaciones: 0, cierres: 0 }
export const actividadDe = (s: EstadoApp, fecha = hoyISO()) => ({ ...ACT_VACIA, ...(s.actividad[fecha] ?? {}) })
export const sumarActividad = (s: EstadoApp, k: keyof Actividad, n: number, fecha = hoyISO()): EstadoApp => {
  const a = actividadDe(s, fecha)
  return { ...s, actividad: { ...s.actividad, [fecha]: { ...a, [k]: Math.max(0, a[k] + n) } } }
}
export const actividadRango = (s: EstadoApp, desde: string, hasta: string) => {
  const t = { ...ACT_VACIA }
  for (const [f, a] of Object.entries(s.actividad)) {
    if (f < desde || f > hasta) continue
    for (const k of Object.keys(t) as (keyof Actividad)[]) t[k] += a[k] || 0
  }
  return t
}

/** Distribución de tiempo sugerida (rápida/larga) según el nivel de la escalera. */
export const splitSugerido = (nivel: number) =>
  nivel <= 2 ? 80 : nivel === 3 ? 70 : nivel === 4 ? 60 : nivel === 5 ? 45 : 30
