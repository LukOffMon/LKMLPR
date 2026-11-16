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
})

/** Mezcla datos guardados con el estado inicial para tolerar versiones viejas o archivos incompletos. */
export const normalizar = (raw: unknown): EstadoApp => {
  const base = estadoInicial()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<EstadoApp>
  return {
    ...base,
    ...r,
    version: 1,
    favoritos: Array.isArray(r.favoritos) ? r.favoritos : base.favoritos,
    checks: r.checks && typeof r.checks === 'object' ? r.checks : {},
    movimientos: Array.isArray(r.movimientos) ? r.movimientos : [],
    metas: Array.isArray(r.metas) ? r.metas : base.metas,
    leads: Array.isArray(r.leads) ? r.leads : [],
    diario: Array.isArray(r.diario) ? r.diario : [],
    tareas: r.tareas && typeof r.tareas === 'object' ? r.tareas : {},
    diasActivos: Array.isArray(r.diasActivos) ? r.diasActivos : [],
    ideasNotas: r.ideasNotas && typeof r.ideasNotas === 'object' ? r.ideasNotas : {},
  }
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
