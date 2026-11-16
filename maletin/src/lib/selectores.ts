import type { EstadoApp } from '../types'
import { ESCALERA, nivelActual } from '../data/escalera'
import { calcularRacha, hoyISO, mesClave } from './utils'

export const resumenMes = (e: EstadoApp, mes = mesClave(hoyISO())) => {
  let ingresos = 0
  let gastos = 0
  for (const m of e.movimientos) {
    if (mesClave(m.fecha) !== mes) continue
    if (m.tipo === 'ingreso') ingresos += m.monto
    else gastos += m.monto
  }
  return { ingresos, gastos, neto: ingresos - gastos }
}

export const totalHistorico = (e: EstadoApp) =>
  e.movimientos.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0)

/** Mejor mes histórico de ingresos (para el nivel alcanzado). */
export const mejorMes = (e: EstadoApp) => {
  const porMes: Record<string, number> = {}
  for (const m of e.movimientos) if (m.tipo === 'ingreso') porMes[mesClave(m.fecha)] = (porMes[mesClave(m.fecha)] || 0) + m.monto
  return Math.max(0, ...Object.values(porMes))
}

export const nivelDe = (e: EstadoApp) => {
  const n = nivelActual(mejorMes(e), totalHistorico(e))
  const actual = ESCALERA.find((x) => x.nivel === n)
  const siguiente = ESCALERA.find((x) => x.nivel === n + 1)
  return { n, actual, siguiente }
}

export const racha = (e: EstadoApp) => calcularRacha(e.diasActivos)

export const seguimientosPendientes = (e: EstadoApp) =>
  e.leads
    .filter((l) => l.seguimiento && !['cerrado', 'perdido'].includes(l.estado))
    .sort((a, b) => a.seguimiento.localeCompare(b.seguimiento))
