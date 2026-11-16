import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Dumbbell, ExternalLink } from 'lucide-react'
import { Card, PageHeader } from '../components/ui'
import { HABILIDADES } from '../data/habilidades'
import { cn } from '../lib/utils'

export function Biblioteca() {
  const [abierto, setAbierto] = useState<string>('ventas')
  return (
    <div>
      <PageHeader kicker="Sección 8" title="Biblioteca de habilidades" sub="Rutas de aprendizaje gratuitas para habilidades de alto valor. Orden recomendado: ventas + IA primero (multiplican todo), luego la habilidad técnica de tu ruta, inglés diario en paralelo." />
      <Card gold className="mb-5">
        <p className="text-sm text-ink-200">
          <span className="font-semibold text-gold-300">Regla 70/30:</span> 70% del tiempo de aprendizaje haciendo trabajo real (para ti o clientes) y 30% en cursos. Aprender sin vender es procrastinación con buena imagen.
        </p>
      </Card>
      <div className="space-y-3">
        {HABILIDADES.map((h, i) => {
          const open = abierto === h.id
          return (
            <div key={h.id} className={cn(open ? 'card-gold' : 'card', 'overflow-hidden')}>
              <button onClick={() => setAbierto(open ? '' : h.id)} className="flex w-full items-center gap-4 p-4 text-left">
                <span className="font-mono text-xs text-gold-500">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{h.nombre}</p>
                  <p className="text-sm text-ink-400">{h.porQue}</p>
                </div>
                <ChevronDown className={cn('h-5 w-5 shrink-0 text-ink-400 transition', open && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="border-t border-ink-700/70 p-4">
                      <ol className="relative space-y-4 border-l border-ink-600 pl-5">
                        {h.orden.map((o, k) => (
                          <li key={o.paso} className="relative">
                            <span className="absolute -left-[27px] top-0 grid h-5 w-5 place-items-center rounded-full border border-gold-500/60 bg-ink-900 font-mono text-[10px] text-gold-300">{k + 1}</span>
                            <p className="text-sm font-medium text-ink-100">{o.paso}</p>
                            <ul className="mt-1.5 space-y-1">
                              {o.recursos.map((r) => (
                                <li key={r.nombre} className="text-sm">
                                  {r.url ? (
                                    <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold-300 hover:underline">{r.nombre} <ExternalLink className="h-3 w-3" /></a>
                                  ) : (
                                    <span className="text-ink-200">{r.nombre}</span>
                                  )}
                                  {r.nota && <span className="text-xs text-ink-400"> — {r.nota}</span>}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-4 flex gap-2 rounded-xl bg-money-500/10 p-3 text-sm text-money-300">
                        <Dumbbell className="mt-0.5 h-4 w-4 shrink-0" />
                        <span><span className="font-semibold">Práctica:</span> {h.practica}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
      <p className="mt-5 text-xs text-ink-500">Los recursos son externos y pueden cambiar de precio o disponibilidad. Todos tenían versión gratuita al momento de armar esta guía.</p>
    </div>
  )
}
