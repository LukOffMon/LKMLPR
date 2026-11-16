import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react'
import { useStore } from '../store/store'
import { Badge, Card, PageHeader, SectionTitle } from '../components/ui'
import { OPC_CONTACTOS, OPC_HABILIDADES, OPC_INTERESES, perfilEmprendedor, recomendar } from '../data/diagnostico'
import { categoriaPorId } from '../data/categorias'
import type { Diagnostico as TDiag } from '../types'
import { cn, rango } from '../lib/utils'

const base: TDiag = {
  habilidades: [],
  intereses: [],
  horasSemana: 10,
  horasFinde: 6,
  ventas: 3,
  ingles: 'basico',
  transporte: 'publico',
  contactos: [],
  completado: '',
}

const PASOS = ['Habilidades', 'Intereses', 'Tiempo', 'Gente', 'Contexto'] as const

export function Diagnostico() {
  const { estado, actualizar } = useStore()
  const [editando, setEditando] = useState(!estado.diagnostico)
  const [paso, setPaso] = useState(0)
  const [d, setD] = useState<TDiag>(estado.diagnostico ?? base)

  const toggle = (k: 'habilidades' | 'intereses' | 'contactos', v: string) =>
    setD((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }))

  const terminar = () => {
    const final = { ...d, completado: new Date().toISOString() }
    actualizar((s) => ({ ...s, diagnostico: final, checks: { ...s.checks, 'dia0-7:d0-diag': true } }))
    setEditando(false)
  }

  if (!editando && estado.diagnostico) return <Resultado onRehacer={() => { setPaso(0); setEditando(true) }} />

  return (
    <div>
      <PageHeader kicker="Sección 1" title="Diagnóstico inicial" sub="Responde con honestidad: el sistema recomienda rutas según lo que tienes HOY, no lo que te gustaría tener." />
      <div className="mb-5 flex gap-1.5">
        {PASOS.map((p, i) => (
          <button key={p} onClick={() => setPaso(i)} className="flex-1 text-left">
            <div className={cn('h-1 rounded-full transition', i <= paso ? 'bg-gold-500' : 'bg-ink-700')} />
            <span className={cn('mt-1.5 hidden text-xs sm:block', i === paso ? 'text-gold-300' : 'text-ink-500')}>{p}</span>
          </button>
        ))}
      </div>

      <Card className="min-h-[340px]">
        <AnimatePresence mode="wait">
          <motion.div key={paso} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
            {paso === 0 && (
              <Pregunta titulo="¿Qué sabes hacer hoy, aunque sea a nivel básico?" sub="Elige todas las que apliquen.">
                <Chips opciones={OPC_HABILIDADES} sel={d.habilidades} onToggle={(v) => toggle('habilidades', v)} />
              </Pregunta>
            )}
            {paso === 1 && (
              <Pregunta titulo="¿Qué te interesa o te da curiosidad?" sub="Lo que disfrutas lo aguantas más tiempo.">
                <Chips opciones={OPC_INTERESES} sel={d.intereses} onToggle={(v) => toggle('intereses', v)} />
              </Pregunta>
            )}
            {paso === 2 && (
              <Pregunta titulo="¿Cuántas horas REALES tienes para el negocio?" sub="Después de escuela, tareas, dormir 8 h y ejercicio.">
                <Slider label="Entre semana (total lunes–viernes)" value={d.horasSemana} max={30} onChange={(v) => setD({ ...d, horasSemana: v })} />
                <Slider label="Fin de semana (total)" value={d.horasFinde} max={16} onChange={(v) => setD({ ...d, horasFinde: v })} />
                <p className="mt-2 text-sm text-ink-400">Total: <span className="font-semibold text-gold-300">{d.horasSemana + d.horasFinde} h/semana</span>. Recomendado con prepa: 12–20 h.</p>
              </Pregunta>
            )}
            {paso === 3 && (
              <Pregunta titulo="¿Qué tan cómodo te sientes vendiendo o hablando con desconocidos?" sub="1 = me cuesta muchísimo · 5 = me encanta">
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setD({ ...d, ventas: n })} className={cn('rounded-xl border py-4 font-display text-xl font-semibold transition', d.ventas === n ? 'border-gold-500 bg-gold-500/15 text-gold-300' : 'border-ink-600 text-ink-300 hover:border-ink-400')}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm font-medium text-ink-200">¿A quién conoces?</p>
                <div className="mt-2">
                  <Chips opciones={OPC_CONTACTOS} sel={d.contactos} onToggle={(v) => toggle('contactos', v)} />
                </div>
              </Pregunta>
            )}
            {paso === 4 && (
              <Pregunta titulo="Contexto" sub="Últimas dos preguntas.">
                <p className="mb-2 text-sm font-medium text-ink-200">Nivel de inglés</p>
                <Opciones
                  value={d.ingles}
                  onChange={(v) => setD({ ...d, ingles: v })}
                  opciones={[
                    { id: 'basico', label: 'Básico' },
                    { id: 'intermedio', label: 'Intermedio (leo bien)' },
                    { id: 'avanzado', label: 'Avanzado (hablo y escribo)' },
                  ]}
                />
                <p className="mb-2 mt-5 text-sm font-medium text-ink-200">Transporte para moverte en Jesús María / Ags</p>
                <Opciones
                  value={d.transporte}
                  onChange={(v) => setD({ ...d, transporte: v })}
                  opciones={[
                    { id: 'ninguno', label: 'Casi no me muevo' },
                    { id: 'publico', label: 'Transporte público / aventones' },
                    { id: 'bici', label: 'Bici' },
                    { id: 'moto_auto', label: 'Moto o auto' },
                  ]}
                />
              </Pregunta>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>

      <div className="mt-4 flex justify-between gap-3">
        <button className="btn-ghost" onClick={() => (paso === 0 && estado.diagnostico ? setEditando(false) : setPaso((p) => Math.max(0, p - 1)))} disabled={paso === 0 && !estado.diagnostico}>
          <ArrowLeft className="h-4 w-4" /> {paso === 0 && estado.diagnostico ? 'Cancelar' : 'Atrás'}
        </button>
        {paso < PASOS.length - 1 ? (
          <button className="btn-gold" onClick={() => setPaso((p) => p + 1)}>
            Siguiente <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button className="btn-gold" onClick={terminar}>
            <Sparkles className="h-4 w-4" /> Ver mi perfil
          </button>
        )}
      </div>
    </div>
  )
}

function Resultado({ onRehacer }: { onRehacer: () => void }) {
  const { estado, actualizar } = useStore()
  const d = estado.diagnostico!
  const perfil = perfilEmprendedor(d)
  const recs = recomendar(d)

  const elegir = (id: string) =>
    actualizar((s) => ({ ...s, rutaElegida: id, checks: { ...s.checks, 'dia0-7:d0-elige': true } }))

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Tu perfil de emprendedor"
        title={perfil.arquetipo}
        sub={perfil.descripcion}
        right={
          <button onClick={onRehacer} className="btn-ghost">
            <RotateCcw className="h-4 w-4" /> Rehacer
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="label mb-2">Tiempo</div>
          <p className="font-display text-2xl font-semibold text-gold-400">{perfil.horas} h/sem</p>
          <p className="mt-1 text-sm text-ink-300">{perfil.ritmo}</p>
        </Card>
        <Card>
          <div className="label mb-2">Fortalezas</div>
          <div className="flex flex-wrap gap-1.5">
            {perfil.fortalezas.map((f) => <Badge key={f} tone="money">{f}</Badge>)}
          </div>
        </Card>
        <Card>
          <div className="label mb-2">A desarrollar</div>
          <ul className="space-y-1 text-sm text-ink-300">
            {perfil.aMejorar.length ? perfil.aMejorar.map((f) => <li key={f}>· {f}</li>) : <li>Mantén la constancia.</li>}
          </ul>
        </Card>
      </div>

      <div>
        <SectionTitle>Tus 3 mejores rutas para empezar</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          {recs.map((r, i) => {
            const elegida = estado.rutaElegida === r.idea.id
            return (
              <motion.div key={r.idea.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card gold={i === 0} className="flex h-full flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-gold-500">#{i + 1}</span>
                    <Badge>{categoriaPorId[r.idea.categoria].corto}</Badge>
                  </div>
                  <h3 className="font-semibold leading-snug">{r.idea.nombre}</h3>
                  <p className="mt-1 text-sm text-ink-300">{r.idea.resumen}</p>
                  <ul className="mt-3 space-y-1 text-xs text-ink-300">
                    {r.razones.map((x) => <li key={x} className="flex gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-money-400" />{x}</li>)}
                  </ul>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-ink-900 px-2.5 py-2"><div className="text-ink-500">Primer peso</div><div className="font-medium">{r.idea.diasPrimerPeso[0]}–{r.idea.diasPrimerPeso[1]} días</div></div>
                    <div className="rounded-lg bg-ink-900 px-2.5 py-2"><div className="text-ink-500">Arranque*</div><div className="font-medium text-money-400">{rango(r.idea.ingresos.arranque)}/mes</div></div>
                  </div>
                  <div className="mt-auto flex gap-2 pt-4">
                    <a href={`#/idea/${r.idea.id}`} className="btn-ghost flex-1">Ver ficha</a>
                    <button onClick={() => elegir(r.idea.id)} className={elegida ? 'btn flex-1 bg-money-500/15 text-money-300' : 'btn-gold flex-1'}>
                      {elegida ? <><Check className="h-4 w-4" /> Mi ruta</> : 'Elegir'}
                    </button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-ink-500">*Rangos estimados y conservadores, no son promesa. Dependen de tu ejecución, precios y mercado.</p>
      </div>

      <Card>
        <p className="text-sm text-ink-200">
          <span className="font-semibold text-gold-300">Siguiente paso:</span> elige UNA ruta y abre el{' '}
          <a href="#/protocolo/dia0-7" className="text-gold-400 underline">Protocolo Día 0–7</a>. No elijas tres "para ver cuál funciona": dividir tu tiempo es la forma más común de no avanzar.
        </p>
      </Card>
    </div>
  )
}

function Pregunta({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {sub && <p className="mb-4 mt-1 text-sm text-ink-400">{sub}</p>}
      {children}
    </div>
  )
}

function Chips({ opciones, sel, onToggle }: { opciones: { id: string; label: string }[]; sel: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const on = sel.includes(o.id)
        return (
          <button key={o.id} onClick={() => onToggle(o.id)} className={cn('chip px-3 py-2 text-sm', on ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-600 bg-ink-900 text-ink-300 hover:border-ink-400')}>
            {on && <Check className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Opciones<T extends string>({ value, onChange, opciones }: { value: T; onChange: (v: T) => void; opciones: { id: T; label: string }[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {opciones.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={cn('rounded-xl border px-3 py-2.5 text-left text-sm transition', value === o.id ? 'border-gold-500 bg-gold-500/10 text-gold-200' : 'border-ink-600 text-ink-300 hover:border-ink-400')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Slider({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-ink-300">{label}</span>
        <span className="font-mono text-gold-300">{value} h</span>
      </div>
      <input type="range" min={0} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#d4af37]" />
    </div>
  )
}
