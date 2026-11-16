import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store/store'
import { LOGROS, logrosDesbloqueados } from '../data/logros'

/** Muestra un aviso cuando se desbloquea un logro nuevo (vinculado a hitos reales de los datos). */
export function LogrosToast() {
  const { estado, actualizar } = useStore()
  const [cola, setCola] = useState<string[]>([])
  const desbloqueados = logrosDesbloqueados(estado)
  const clave = desbloqueados.join(',')

  useEffect(() => {
    const nuevos = desbloqueados.filter((id) => !estado.logrosVistos.includes(id))
    if (!nuevos.length) return
    actualizar((s) => ({ ...s, logrosVistos: [...new Set([...s.logrosVistos, ...nuevos])] }))
    setCola((c) => [...c, ...nuevos].slice(0, 3))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  useEffect(() => {
    if (!cola.length) return
    const t = setTimeout(() => setCola((c) => c.slice(1)), 4200)
    return () => clearTimeout(t)
  }, [cola])

  const l = LOGROS.find((x) => x.id === cola[0])
  return (
    <AnimatePresence>
      {l && (
        <motion.a
          key={l.id}
          href="#/herramientas/logros"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          className="card-gold fixed inset-x-4 top-4 z-50 mx-auto flex max-w-sm items-center gap-3 p-4 shadow-2xl"
          role="status"
        >
          <span className="text-3xl">{l.icono}</span>
          <div>
            <div className="label text-gold-400">Logro desbloqueado</div>
            <p className="font-semibold">{l.nombre}</p>
            <p className="text-xs text-ink-400">{l.desc}</p>
          </div>
        </motion.a>
      )}
    </AnimatePresence>
  )
}
