import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { EstadoApp } from '../types'
import { hoyISO } from '../lib/utils'

const CLAVE = 'maletin:v1'

export const estadoInicial = (): EstadoApp => ({
  version: 1,
  nombre: '',
  diagnostico: null,
  rutaElegida: null,
  favoritos: [],
  checks: {},
  movimientos: [],
  metas: [
    { id: 'fondo', nombre: 'Fondo de emergencia (meta inicial)', objetivo: 5000, actual: 0, creada: hoyISO() },
  ],
  leads: [],
  diario: [],
  tareas: {},
  diasActivos: [],
  ideasNotas: {},
  config: { pctReinversion: 20, pctTiempoRapida: 80, metaMes: 5000 },
  fondoLargo: [],
  sprints: [],
  actividad: {},
  ofertas: [],
  plan: [],
  ice: [],
  semana: {},
  rituales: {},
  revisionesMes: [],
  productos: [],
  cotizaciones: [],
  sesionesFoco: [],
  focoActivo: null,
  logrosVistos: [],
  logrosManuales: [],
})

/**
 * Mezcla datos guardados con el estado inicial: cada campo se acepta solo si tiene el mismo tipo
 * que el valor por defecto. Así los respaldos viejos (v1) cargan sin perder nada y sin romper la app.
 */
export const normalizar = (raw: unknown): EstadoApp => {
  const base = estadoInicial()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const out: Record<string, unknown> = { ...base }
  for (const k of Object.keys(base) as (keyof EstadoApp)[]) {
    const def = base[k] as unknown
    const v = r[k]
    if (v === undefined) continue
    if (Array.isArray(def)) { if (Array.isArray(v)) out[k] = v; continue }
    if (def === null) { out[k] = v === null || typeof v === 'string' || (typeof v === 'object' && !Array.isArray(v)) ? v : null; continue }
    if (typeof def === 'object') { if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = { ...(def as object), ...(v as object) }; continue }
    if (typeof v === typeof def) out[k] = v
  }
  out.version = 1
  // Si el usuario tenía metas guardadas vacías a propósito, respetarlo.
  if (Array.isArray(r.metas)) out.metas = r.metas
  return out as unknown as EstadoApp
}

const cargar = (): EstadoApp => {
  try {
    const s = localStorage.getItem(CLAVE)
    return s ? normalizar(JSON.parse(s)) : estadoInicial()
  } catch {
    return estadoInicial()
  }
}

type Actualizar = (fn: (s: EstadoApp) => EstadoApp) => void

interface Ctx {
  estado: EstadoApp
  actualizar: Actualizar
  /** Marca hoy como día ejecutado (para la racha). */
  marcarActivo: () => void
  reemplazar: (e: EstadoApp) => void
  guardadoOk: boolean
}

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoApp>(cargar)
  const [guardadoOk, setGuardadoOk] = useState(true)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(CLAVE, JSON.stringify(estado))
        setGuardadoOk(true)
      } catch {
        setGuardadoOk(false)
      }
    }, 150)
    return () => window.clearTimeout(timer.current)
  }, [estado])

  // Guardar de inmediato al cerrar/ocultar la pestaña (importante en celular).
  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(CLAVE, JSON.stringify(estadoRef.current))
      } catch {
        /* sin espacio o bloqueado */
      }
    }
    const onVis = () => document.visibilityState === 'hidden' && flush()
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const estadoRef = useRef(estado)
  estadoRef.current = estado

  const actualizar = useCallback<Actualizar>((fn) => setEstado((s) => fn(s)), [])

  const marcarActivo = useCallback(() => {
    const hoy = hoyISO()
    setEstado((s) => (s.diasActivos.includes(hoy) ? s : { ...s, diasActivos: [...s.diasActivos, hoy] }))
  }, [])

  const reemplazar = useCallback((e: EstadoApp) => setEstado(normalizar(e)), [])

  const value = useMemo(
    () => ({ estado, actualizar, marcarActivo, reemplazar, guardadoOk }),
    [estado, actualizar, marcarActivo, reemplazar, guardadoOk],
  )
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('useStore fuera de StoreProvider')
  return c
}

export const exportarJSON = (estado: EstadoApp) => {
  const blob = new Blob([JSON.stringify({ app: 'maletin', exportado: new Date().toISOString(), estado }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `maletin-respaldo-${hoyISO()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const leerRespaldo = async (file: File): Promise<EstadoApp> => {
  const texto = await file.text()
  const json = JSON.parse(texto)
  const datos = json && json.app === 'maletin' && json.estado ? json.estado : json
  if (!datos || typeof datos !== 'object' || !('checks' in datos || 'movimientos' in datos || 'leads' in datos)) {
    throw new Error('El archivo no parece un respaldo de Maletín.')
  }
  return normalizar(datos)
}
