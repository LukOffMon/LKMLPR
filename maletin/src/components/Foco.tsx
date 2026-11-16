import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Timer, X } from 'lucide-react'
import { useStore } from '../store/store'
import { useNow } from '../lib/useNow'
import { duracionTexto, hoyISO, uid } from '../lib/utils'

export const beep = () => {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    ;[0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.22)
    })
  } catch {
    /* sin audio */
  }
}

/** Vigila el temporizador global: al terminar registra la sesión y avisa. Vive en el Layout. */
export function FocoGlobal() {
  const { estado, actualizar, marcarActivo } = useStore()
  const f = estado.focoActivo
  const now = useNow(1000)
  const [aviso, setAviso] = useState<string | null>(null)
  const terminado = useRef<number | null>(null)

  useEffect(() => {
    if (!f || f.pausadoRestante || f.fin > now || terminado.current === f.fin) return
    terminado.current = f.fin
    beep()
    if (f.tipo === 'foco') {
      actualizar((s) => (s.focoActivo?.fin !== f.fin ? s : { ...s, focoActivo: null, sesionesFoco: [...s.sesionesFoco, { id: uid(), fecha: hoyISO(), minutos: f.minutos, tarea: f.tarea }] }))
      marcarActivo()
      setAviso(`Sesión de ${f.minutos} min completada. Toma un descanso corto.`)
    } else {
      actualizar((s) => (s.focoActivo?.fin !== f.fin ? s : { ...s, focoActivo: null }))
      setAviso('Descanso terminado. ¿Otra sesión?')
    }
    const t = setTimeout(() => setAviso(null), 6000)
    return () => clearTimeout(t)
  }, [f, now, actualizar, marcarActivo])

  const restante = f ? (f.pausadoRestante ?? f.fin - now) : 0

  return (
    <>
      <AnimatePresence>
        {f && !window.location.hash.includes('herramientas/enfoque') && (
          <motion.a
            href="#/herramientas/enfoque"
            aria-label={`Temporizador de ${f.tipo === 'foco' ? 'enfoque' : 'descanso'}: ${duracionTexto(Math.max(0, restante))}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-gold-600/50 bg-ink-900/95 px-3.5 py-2 text-sm shadow-xl backdrop-blur lg:bottom-6"
          >
            <Timer className={f.tipo === 'foco' ? 'h-4 w-4 text-gold-400' : 'h-4 w-4 text-money-400'} />
            <span className="font-mono tabular-nums">{duracionTexto(Math.max(0, restante)).replace(/^0:/, '')}</span>
            {f.pausadoRestante ? <Pause className="h-3.5 w-3.5 text-ink-400" /> : null}
          </motion.a>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {aviso && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-money-500/40 bg-ink-900/95 p-4 shadow-2xl backdrop-blur" role="status">
            <Timer className="h-5 w-5 shrink-0 text-money-400" />
            <p className="flex-1 text-sm">{aviso}</p>
            <button onClick={() => setAviso(null)} aria-label="Cerrar"><X className="h-4 w-4 text-ink-400" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

