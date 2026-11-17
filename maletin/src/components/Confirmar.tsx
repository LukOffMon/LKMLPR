import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

type Pedido = { mensaje: string; resolver: (ok: boolean) => void }
let abrir: ((p: Pedido) => void) | null = null

/**
 * Confirmación dentro de la app. Sustituye a window.confirm(), que algunos entornos
 * (como las páginas de claude.ai) bloquean y devuelve false sin mostrar nada.
 */
export const confirmar = (mensaje: string) =>
  new Promise<boolean>((resolver) => {
    if (abrir) abrir({ mensaje, resolver })
    else resolver(false)
  })

export function ConfirmHost() {
  const [p, setP] = useState<Pedido | null>(null)
  const ok = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    abrir = (nuevo) => setP((actual) => {
      actual?.resolver(false)
      return nuevo
    })
    return () => { abrir = null }
  }, [])

  useEffect(() => {
    if (!p) return
    ok.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cerrar(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p])

  const cerrar = (v: boolean) => {
    p?.resolver(v)
    setP(null)
  }

  return (
    <AnimatePresence>
      {p && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => cerrar(false)} />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmar-msg"
            className="card relative w-full max-w-sm p-5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn-400" />
              <p id="confirmar-msg" className="text-sm text-ink-100">{p.mensaje}</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => cerrar(false)}>Cancelar</button>
              <button ref={ok} className="btn border border-alert-500/50 bg-alert-500/15 text-alert-400 hover:bg-alert-500/25" onClick={() => cerrar(true)}>Confirmar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
