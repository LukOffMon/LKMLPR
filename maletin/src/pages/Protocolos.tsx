import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Info, RotateCcw } from 'lucide-react'
import { useStore } from '../store/store'
import { Card, CheckRow, PageHeader, Progress } from '../components/ui'
import { PROTOCOLOS } from '../data/protocolos'
import type { EstadoApp, Protocolo } from '../types'

const avance = (p: Protocolo, checks: EstadoApp['checks']) => {
  const items = p.bloques.flatMap((b) => b.items)
  const hechos = items.filter((i) => checks[`${p.id}:${i.id}`]).length
  return { hechos, total: items.length }
}

export function Protocolos() {
  const { estado } = useStore()
  return (
    <div>
      <PageHeader kicker="Sección 3" title="Protocolos" sub="Sistemas paso a paso. Tu progreso se guarda automáticamente. Ejecuta en orden: Día 0–7 → 30 días → 90 días; el resto son hábitos permanentes." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PROTOCOLOS.map((p, i) => {
          const a = avance(p, estado.checks)
          const done = a.hechos === a.total
          return (
            <motion.a key={p.id} href={`#/protocolo/${p.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={done ? 'card-gold flex flex-col p-5 transition hover:-translate-y-0.5' : 'card flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-gold-600/50'}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs text-gold-500">P-{String(i + 1).padStart(2, '0')}</span>
                <span className="text-xs text-ink-400">{p.duracion}</span>
              </div>
              <h3 className="font-semibold">{p.nombre}</h3>
              <p className="mt-1 flex-1 text-sm text-ink-400">{p.objetivo}</p>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={a.hechos} max={a.total} color={done ? 'money' : 'gold'} />
                <span className="shrink-0 font-mono text-xs text-ink-300">{a.hechos}/{a.total}</span>
              </div>
            </motion.a>
          )
        })}
      </div>
    </div>
  )
}

export function ProtocoloDetalle({ id }: { id: string }) {
  const { estado, actualizar, marcarActivo } = useStore()
  const idx = PROTOCOLOS.findIndex((p) => p.id === id)
  const p = PROTOCOLOS[idx]
  if (!p) return <p className="py-20 text-center text-ink-300">Protocolo no encontrado.</p>
  const a = avance(p, estado.checks)
  const sig = PROTOCOLOS[idx + 1]

  const toggle = (itemId: string) => {
    const k = `${p.id}:${itemId}`
    const nuevo = !estado.checks[k]
    actualizar((s) => ({ ...s, checks: { ...s.checks, [k]: nuevo } }))
    if (nuevo) marcarActivo()
  }
  const reiniciar = () => {
    if (!confirm('¿Reiniciar el progreso de este protocolo?')) return
    actualizar((s) => {
      const checks = { ...s.checks }
      for (const k of Object.keys(checks)) if (k.startsWith(`${p.id}:`)) delete checks[k]
      return { ...s, checks }
    })
  }

  return (
    <div className="space-y-5">
      <a href="#/protocolos" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-gold-300">
        <ArrowLeft className="h-4 w-4" /> Protocolos
      </a>
      <PageHeader
        kicker={`${p.duracion}`}
        title={p.nombre}
        sub={p.objetivo}
        right={
          <button onClick={reiniciar} className="btn-ghost text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </button>
        }
      />
      <Card gold>
        <p className="text-sm leading-relaxed text-ink-200">{p.intro}</p>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={a.hechos} max={a.total} color={a.hechos === a.total ? 'money' : 'gold'} />
          <span className="shrink-0 font-mono text-sm text-gold-300">{Math.round((a.hechos / a.total) * 100)}%</span>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {p.bloques.map((b) => {
          const h = b.items.filter((i) => estado.checks[`${p.id}:${i.id}`]).length
          return (
            <Card key={b.titulo}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-semibold">{b.titulo}</h2>
                <span className="font-mono text-xs text-ink-400">{h}/{b.items.length}</span>
              </div>
              <div className="-mx-2">
                {b.items.map((it) => (
                  <CheckRow key={it.id} checked={!!estado.checks[`${p.id}:${it.id}`]} onToggle={() => toggle(it.id)} detalle={it.detalle}>
                    {it.texto}
                  </CheckRow>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      {p.notas && (
        <Card>
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><Info className="h-4 w-4 text-gold-500" /> Notas</h2>
          <ul className="space-y-1.5 text-sm text-ink-300">
            {p.notas.map((n) => <li key={n}>· {n}</li>)}
          </ul>
        </Card>
      )}

      {a.hechos === a.total && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card-gold p-5 text-center">
          <p className="font-display text-lg font-semibold text-gold-300">Protocolo completado</p>
          <p className="mt-1 text-sm text-ink-300">Bien ejecutado. Registra lo aprendido en tu Diario.</p>
        </motion.div>
      )}

      {sig && (
        <a href={`#/protocolo/${sig.id}`} className="card flex items-center justify-between p-4 hover:border-gold-600/50">
          <div>
            <div className="label">Siguiente</div>
            <div className="font-medium">{sig.nombre}</div>
          </div>
          <ArrowRight className="h-5 w-5 text-gold-500" />
        </a>
      )}
    </div>
  )
}
