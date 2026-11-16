import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { Badge, Card, Empty, Field, PageHeader, SectionTitle, Sheet } from '../components/ui'
import type { EntradaDiario } from '../types'
import { dinero, dineroCorto, fechaCorta, lunesDe, mesClave, parseISO, sumarDias, uid } from '../lib/utils'
import { cn } from '../lib/utils'

const nueva = (semana: string, ingresos: number): EntradaDiario => ({
  id: '',
  semana,
  funciono: '',
  noFunciono: '',
  ingresos,
  mensajes: 0,
  respuestas: 0,
  ventas: 0,
  horas: 0,
  aprendizaje: '',
  plan: '',
  energia: 3,
  creada: new Date().toISOString(),
})

export function Diario() {
  const { estado, actualizar, marcarActivo } = useStore()
  const [edit, setEdit] = useState<EntradaDiario | null>(null)
  const semanaActual = lunesDe()

  const ingresosSemana = (lunes: string) => {
    const fin = sumarDias(lunes, 6)
    return estado.movimientos.filter((m) => m.tipo === 'ingreso' && m.fecha >= lunes && m.fecha <= fin).reduce((a, m) => a + m.monto, 0)
  }

  const entradas = [...estado.diario].sort((a, b) => b.semana.localeCompare(a.semana))
  const yaHay = entradas.find((e) => e.semana === semanaActual)

  const serie = useMemo(
    () => [...estado.diario].sort((a, b) => a.semana.localeCompare(b.semana)).slice(-12).map((e) => ({ semana: fechaCorta(e.semana), Ingresos: e.ingresos, Mensajes: e.mensajes })),
    [estado.diario],
  )

  const guardar = (e: EntradaDiario) => {
    const final = { ...e, id: e.id || uid() }
    actualizar((s) => ({ ...s, diario: e.id ? s.diario.map((x) => (x.id === e.id ? final : x)) : [...s.diario.filter((x) => x.semana !== final.semana), final] }))
    marcarActivo()
    setEdit(null)
  }

  return (
    <div>
      <PageHeader
        kicker="Sección 10"
        title="Diario y revisión semanal"
        sub="Cada domingo, 30–60 minutos. Lo que funcionó se duplica; lo que no, se corta."
        right={
          <button onClick={() => setEdit(yaHay ?? nueva(semanaActual, ingresosSemana(semanaActual)))} className="btn-gold">
            {yaHay ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {yaHay ? 'Editar esta semana' : 'Revisión de esta semana'}
          </button>
        }
      />

      {serie.length >= 2 && (
        <Card className="mb-5">
          <SectionTitle>Tendencia semanal</SectionTitle>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ left: -12, right: 8, top: 4 }}>
                <CartesianGrid stroke="#22262d" vertical={false} />
                <XAxis dataKey="semana" stroke="#6f7783" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="a" stroke="#6f7783" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => dineroCorto(Number(v))} />
                <YAxis yAxisId="b" orientation="right" stroke="#6f7783" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#121418', border: '1px solid #2e333c', borderRadius: 12, fontSize: 12 }} />
                <Line yAxisId="a" type="monotone" dataKey="Ingresos" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line yAxisId="b" type="monotone" dataKey="Mensajes" stroke="#d4af37" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {entradas.length === 0 ? (
        <Empty icon={<NotebookPen className="h-8 w-8" />} title="Sin revisiones todavía">Haz la primera este domingo. Incluso si la semana fue mala: sobre todo si fue mala.</Empty>
      ) : (
        <div className="space-y-4">
          {entradas.map((e) => {
            const tasa = e.mensajes ? Math.round((e.respuestas / e.mensajes) * 100) : 0
            return (
              <Card key={e.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">Semana del {fechaCorta(e.semana)} al {fechaCorta(sumarDias(e.semana, 6))}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="money">{dinero(e.ingresos)}</Badge>
                      <Badge>{e.mensajes} mensajes</Badge>
                      <Badge>{tasa}% respuesta</Badge>
                      <Badge>{e.ventas} ventas</Badge>
                      <Badge>{e.horas} h</Badge>
                      <Badge tone={e.energia <= 2 ? 'alert' : 'gold'}>Energía {e.energia}/5</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEdit(e)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-700" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => confirm('¿Eliminar esta revisión?') && actualizar((s) => ({ ...s, diario: s.diario.filter((x) => x.id !== e.id) }))} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-700 hover:text-alert-400" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                  <Bloque t="Qué funcionó" v={e.funciono} />
                  <Bloque t="Qué no funcionó" v={e.noFunciono} />
                  <Bloque t="Aprendizaje" v={e.aprendizaje} />
                  <Bloque t="Plan de la siguiente semana" v={e.plan} gold />
                </div>
                {e.energia <= 2 && <p className="mt-3 text-xs text-alert-400">Energía baja: revisa el <a href="#/protocolo/anti-burnout" className="underline">Protocolo anti-burnout</a>.</p>}
              </Card>
            )
          })}
        </div>
      )}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Revisión semanal" wide>
        {edit && <FormDiario inicial={edit} onGuardar={guardar} ingresosSemana={ingresosSemana} />}
      </Sheet>
    </div>
  )
}

function Bloque({ t, v, gold }: { t: string; v: string; gold?: boolean }) {
  if (!v) return null
  return (
    <div>
      <div className={cn('label mb-1', gold && 'text-gold-500')}>{t}</div>
      <p className="whitespace-pre-wrap text-ink-200">{v}</p>
    </div>
  )
}

function FormDiario({ inicial, onGuardar, ingresosSemana }: { inicial: EntradaDiario; onGuardar: (e: EntradaDiario) => void; ingresosSemana: (l: string) => number }) {
  const [e, setE] = useState(inicial)
  const set = <K extends keyof EntradaDiario>(k: K, v: EntradaDiario[K]) => setE((x) => ({ ...x, [k]: v }))
  const num = (k: 'ingresos' | 'mensajes' | 'respuestas' | 'ventas' | 'horas') => (
    <input className="input font-mono" type="number" min="0" inputMode="decimal" value={e[k] || ''} onChange={(ev) => set(k, Number(ev.target.value) || 0)} />
  )
  return (
    <form
      className="space-y-4"
      onSubmit={(ev) => {
        ev.preventDefault()
        onGuardar(e)
      }}
    >
      <Field label="Semana (lunes)" hint={`Mes: ${mesClave(e.semana)}`}>
        <input
          className="input"
          type="date"
          value={e.semana}
          onChange={(ev) => {
            const l = lunesDe(parseISO(ev.target.value))
            setE((x) => ({ ...x, semana: l, ingresos: x.id ? x.ingresos : ingresosSemana(l) }))
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field label="Ingresos">{num('ingresos')}</Field>
        <Field label="Mensajes">{num('mensajes')}</Field>
        <Field label="Respuestas">{num('respuestas')}</Field>
        <Field label="Ventas">{num('ventas')}</Field>
        <Field label="Horas">{num('horas')}</Field>
      </div>
      <Field label="Qué funcionó"><textarea className="input min-h-20" value={e.funciono} onChange={(ev) => set('funciono', ev.target.value)} placeholder="Ej. Los mensajes con maqueta especulativa tuvieron 3 respuestas de 5." /></Field>
      <Field label="Qué no funcionó"><textarea className="input min-h-20" value={e.noFunciono} onChange={(ev) => set('noFunciono', ev.target.value)} /></Field>
      <Field label="Aprendizaje principal"><textarea className="input min-h-16" value={e.aprendizaje} onChange={(ev) => set('aprendizaje', ev.target.value)} /></Field>
      <Field label="Plan de la siguiente semana (3 prioridades)"><textarea className="input min-h-20" value={e.plan} onChange={(ev) => set('plan', ev.target.value)} placeholder={'1.\n2.\n3.'} /></Field>
      <div>
        <span className="mb-1.5 block text-xs font-medium text-ink-300">Energía de la semana</span>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => set('energia', n)} className={cn('rounded-xl border py-2 font-mono', e.energia === n ? 'border-gold-500 bg-gold-500/15 text-gold-300' : 'border-ink-600 text-ink-400')}>{n}</button>
          ))}
        </div>
      </div>
      <button className="btn-gold w-full">Guardar revisión</button>
    </form>
  )
}
