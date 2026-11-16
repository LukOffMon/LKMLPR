import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Lock, Scale } from 'lucide-react'
import { useStore } from '../store/store'
import { Badge, Card, PageHeader, Progress } from '../components/ui'
import { ESCALERA } from '../data/escalera'
import { IDEAS } from '../data/ideas'
import { mejorMes, nivelDe, resumenMes } from '../lib/selectores'
import { cn, dinero, dineroCorto } from '../lib/utils'

export function Escalera() {
  const { estado } = useStore()
  const { n, siguiente } = nivelDe(estado)
  const mes = resumenMes(estado)
  const mejor = mejorMes(estado)
  const [abierto, setAbierto] = useState<number>(Math.max(1, Math.min(7, n + 1)))

  return (
    <div>
      <PageHeader kicker="Sección 4" title="Escalera de riqueza" sub="Habilidades vendibles → ingresos → ahorro → sistemas → escala → inversión. Tu nivel se calcula con tu mejor mes registrado en Finanzas." />

      <Card gold className="mb-6 grid gap-4 sm:grid-cols-3">
        <div>
          <div className="label">Nivel alcanzado</div>
          <div className="mt-1 font-display text-3xl font-semibold text-gold-400">{n} <span className="text-base text-ink-400">/ 7</span></div>
        </div>
        <div>
          <div className="label">Mejor mes</div>
          <div className="mt-1 font-display text-2xl font-semibold text-money-400">{dinero(mejor)}</div>
          <div className="text-xs text-ink-400">Este mes: {dinero(mes.ingresos)}</div>
        </div>
        <div>
          <div className="label">Hacia el siguiente</div>
          {siguiente ? (
            <>
              <div className="mt-1 text-sm text-ink-200">Nivel {siguiente.nivel}: {siguiente.nombre}</div>
              <Progress className="mt-2" value={siguiente.nivel === 1 ? 0 : mes.ingresos} max={siguiente.umbral} color="money" />
            </>
          ) : (
            <div className="mt-1 text-sm text-money-300">Cima alcanzada. Protege lo construido.</div>
          )}
        </div>
      </Card>

      <div className="relative space-y-3 pl-8 sm:pl-10">
        <div className="absolute bottom-4 left-[13px] top-4 w-px bg-gradient-to-b from-gold-500/70 via-ink-600 to-ink-700 sm:left-[17px]" />
        {ESCALERA.map((e) => {
          const logrado = e.nivel <= n
          const actual = e.nivel === n + 1
          const open = abierto === e.nivel
          const desbloqueadas = IDEAS.filter((i) => (i.nivelMin ?? 1) === e.nivel && e.nivel > 1)
          return (
            <div key={e.nivel} className="relative">
              <div
                className={cn(
                  'absolute -left-8 top-4 grid h-7 w-7 place-items-center rounded-full border text-xs font-bold sm:-left-10 sm:h-9 sm:w-9',
                  logrado ? 'border-money-500 bg-money-500 text-ink-950' : actual ? 'border-gold-500 bg-ink-900 text-gold-400 shadow-[0_0_0_4px_rgba(212,175,55,0.15)]' : 'border-ink-600 bg-ink-900 text-ink-500',
                )}
              >
                {logrado ? <Check className="h-4 w-4" strokeWidth={3} /> : e.nivel}
              </div>
              <div className={cn(actual ? 'card-gold' : 'card', 'overflow-hidden')}>
                <button onClick={() => setAbierto(open ? 0 : e.nivel)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Nivel {e.nivel} · {e.nombre}</span>
                      {logrado && <Badge tone="money">Logrado</Badge>}
                      {actual && <Badge tone="gold">En curso</Badge>}
                      {!logrado && !actual && <Lock className="h-3.5 w-3.5 text-ink-500" />}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-400">{e.meta}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden font-mono text-sm text-money-400 sm:inline">{e.nivel === 1 ? '$1' : `${dineroCorto(e.umbral)}/mes`}</span>
                    <ChevronDown className={cn('h-5 w-5 text-ink-400 transition', open && 'rotate-180')} />
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="grid gap-4 border-t border-ink-700/70 p-4 md:grid-cols-2">
                        <Col titulo="Enfoque"><p>{e.enfoque}</p></Col>
                        <Col titulo="Qué cambia"><Ul items={e.queCambia} /></Col>
                        <Col titulo="Qué hacer"><Ul items={e.hacer} /></Col>
                        <Col titulo="Desbloquea">
                          <Ul items={e.desbloquea} />
                          {desbloqueadas.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {desbloqueadas.map((i) => (
                                <a key={i.id} href={`#/idea/${i.id}`} className="chip border-gold-600/40 bg-gold-500/5 text-gold-300 hover:bg-gold-500/15">{i.nombre.split(' (')[0]}</a>
                              ))}
                            </div>
                          )}
                        </Col>
                        <Col titulo="Formalización">
                          <p className="flex gap-2"><Scale className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />{e.formalizacion}</p>
                        </Col>
                        <Col titulo="Peligro de este nivel"><p className="text-alert-400/90">{e.peligro}</p></Col>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-6 text-xs text-ink-500">Los montos son referencias para medir avance, no metas garantizadas ni plazos fijos. Cada nivel puede tomar meses o años. La formalización fiscal es orientativa: verifica con el SAT o un contador.</p>
    </div>
  )
}

function Col({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="text-sm text-ink-200">
      <div className="label mb-1.5">{titulo}</div>
      {children}
    </div>
  )
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((x) => <li key={x} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-500" />{x}</li>)}
    </ul>
  )
}
