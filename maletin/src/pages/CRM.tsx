import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, ChevronRight, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { useStore } from '../store/store'
import { Badge, Card, Empty, Field, PageHeader, Segmented, Sheet, Stat } from '../components/ui'
import type { EstadoLead, Lead } from '../types'
import { IDEAS } from '../data/ideas'
import { cn, diffDias, dinero, dineroCorto, fechaCorta, hoyISO, sumarDias, uid } from '../lib/utils'
import { confirmar } from '../components/Confirmar'

export const ESTADOS: { id: EstadoLead; label: string; color: string }[] = [
  { id: 'contactado', label: 'Contactado', color: '#6f7783' },
  { id: 'interesado', label: 'Interesado', color: '#60a5fa' },
  { id: 'cotizado', label: 'Cotizado', color: '#f59e0b' },
  { id: 'cerrado', label: 'Cerrado', color: '#34d399' },
  { id: 'recurrente', label: 'Recurrente', color: '#d4af37' },
  { id: 'perdido', label: 'Perdido', color: '#ef4444' },
]
const estadoInfo = Object.fromEntries(ESTADOS.map((e) => [e.id, e])) as Record<EstadoLead, (typeof ESTADOS)[number]>
/** Probabilidad de cierre por etapa, para el valor proyectado del pipeline. */
export const PROB_ESTADO: Record<EstadoLead, number> = { contactado: 0.1, interesado: 0.3, cotizado: 0.5, cerrado: 1, recurrente: 1, perdido: 0 }

const SIGUIENTE: Partial<Record<EstadoLead, EstadoLead>> = { contactado: 'interesado', interesado: 'cotizado', cotizado: 'cerrado', cerrado: 'recurrente' }

const vacio = (): Lead => ({
  id: '',
  nombre: '',
  negocio: '',
  contacto: '',
  canal: 'WhatsApp',
  servicio: '',
  estado: 'contactado',
  valor: 0,
  seguimiento: sumarDias(hoyISO(), 3),
  notas: '',
  creado: hoyISO(),
  actualizado: hoyISO(),
})

export function CRM() {
  const { estado, actualizar, marcarActivo } = useStore()
  const [filtro, setFiltro] = useState<EstadoLead | 'todos' | 'hoy'>('todos')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Lead | null>(null)
  const [vista, setVista] = useState<'kanban' | 'lista'>('kanban')

  const hoy = hoyISO()
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    return estado.leads
      .filter((l) => (filtro === 'todos' ? true : filtro === 'hoy' ? l.seguimiento && l.seguimiento <= hoy && !['cerrado', 'perdido'].includes(l.estado) : l.estado === filtro))
      .filter((l) => !t || `${l.nombre} ${l.negocio} ${l.servicio}`.toLowerCase().includes(t))
      .sort((a, b) => (a.seguimiento || '9999').localeCompare(b.seguimiento || '9999'))
  }, [estado.leads, filtro, q, hoy])

  const stats = useMemo(() => {
    const L = estado.leads
    const abiertos = L.filter((l) => ['interesado', 'cotizado'].includes(l.estado))
    const ganados = L.filter((l) => ['cerrado', 'recurrente'].includes(l.estado))
    const conv = L.length ? Math.round((ganados.length / L.length) * 100) : 0
    return {
      proyectado: L.filter((l) => ['contactado', 'interesado', 'cotizado'].includes(l.estado)).reduce((a, l) => a + (l.valor || 0) * PROB_ESTADO[l.estado], 0),
      pipeline: abiertos.reduce((a, l) => a + (l.valor || 0), 0),
      ganado: ganados.reduce((a, l) => a + (l.valor || 0), 0),
      conv,
      recurrentes: L.filter((l) => l.estado === 'recurrente').length,
      vencidos: L.filter((l) => l.seguimiento && l.seguimiento <= hoy && !['cerrado', 'perdido'].includes(l.estado)).length,
    }
  }, [estado.leads, hoy])

  const guardar = (l: Lead) => {
    const nuevo = !l.id
    const final = { ...l, id: l.id || uid(), actualizado: hoyISO() }
    actualizar((s) => ({ ...s, leads: nuevo ? [final, ...s.leads] : s.leads.map((x) => (x.id === final.id ? final : x)) }))
    marcarActivo()
    setEdit(null)
  }
  const avanzar = (l: Lead) => {
    const sig = SIGUIENTE[l.estado]
    if (!sig) return
    actualizar((s) => ({ ...s, leads: s.leads.map((x) => (x.id === l.id ? { ...x, estado: sig, actualizado: hoyISO(), seguimiento: sig === 'cerrado' ? sumarDias(hoyISO(), 30) : sumarDias(hoyISO(), 3) } : x)) }))
    marcarActivo()
  }

  const conteo = (e: EstadoLead) => estado.leads.filter((l) => l.estado === e).length

  return (
    <div>
      <PageHeader
        kicker="Sección 6"
        title="Clientes (CRM)"
        sub="Cada prospecto con su estado y fecha de seguimiento. La fortuna está en el seguimiento."
        right={<button onClick={() => setEdit(vacio())} className="btn-gold"><Plus className="h-4 w-4" /> Prospecto</button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><Stat label="Proyectado" value={dineroCorto(stats.proyectado)} tone="gold" sub={`${dineroCorto(stats.pipeline)} en negociación`} /></Card>
        <Card><Stat label="Ganado" value={dineroCorto(stats.ganado)} tone="money" /></Card>
        <Card><Stat label="Conversión" value={`${stats.conv}%`} sub={`${estado.leads.length} prospectos`} /></Card>
        <Card><Stat label="Recurrentes" value={stats.recurrentes} sub={`${stats.vencidos} seguimientos para hoy`} /></Card>
      </div>

      {/* Embudo */}
      <div className="mb-4 grid grid-cols-6 gap-1 overflow-hidden rounded-xl">
        {ESTADOS.map((e) => (
          <button key={e.id} onClick={() => setFiltro(filtro === e.id ? 'todos' : e.id)} className={cn('px-1 py-2 text-center transition', filtro === e.id ? 'bg-ink-700' : 'bg-ink-850 hover:bg-ink-800')} style={{ borderTop: `2px solid ${e.color}` }}>
            <div className="font-mono text-base font-semibold">{conteo(e.id)}</div>
            <div className="truncate text-[10px] text-ink-400 sm:text-xs">{e.label}</div>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input className="input pl-9" placeholder="Buscar prospecto" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={() => setFiltro('todos')} className={cn('chip px-3', filtro === 'todos' ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-700 text-ink-300')}>Todos</button>
        <Segmented value={vista} onChange={setVista} options={[{ id: 'kanban', label: 'Kanban' }, { id: 'lista', label: 'Lista' }]} />
        <button onClick={() => setFiltro('hoy')} className={cn('chip px-3', filtro === 'hoy' ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-700 text-ink-300')}><CalendarClock className="h-3.5 w-3.5" /> Para hoy ({stats.vencidos})</button>
      </div>

      {estado.leads.length === 0 ? (
        <Empty icon={<Users className="h-8 w-8" />} title="Tu lista está vacía">Agrega tus primeros 30 prospectos (Protocolo Día 0–7).</Empty>
      ) : vista === 'kanban' ? (
        <Kanban leads={lista} onEdit={setEdit} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {lista.map((l) => {
              const e = estadoInfo[l.estado]
              const d = l.seguimiento ? diffDias(hoy, l.seguimiento) : null
              const sig = SIGUIENTE[l.estado]
              return (
                <motion.div key={l.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="card p-4" style={{ borderLeft: `3px solid ${e.color}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{l.nombre}</p>
                      <p className="truncate text-sm text-ink-400">{[l.negocio, l.servicio].filter(Boolean).join(' · ') || '—'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => setEdit(l)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-700 hover:text-ink-100" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => void confirmar(`¿Eliminar a ${l.nombre}?`).then((ok) => ok && actualizar((s) => ({ ...s, leads: s.leads.filter((x) => x.id !== l.id) })))} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-700 hover:text-alert-400" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="chip" style={{ borderColor: `${e.color}66`, color: e.color, background: `${e.color}14` }}>{e.label}</span>
                    {l.valor > 0 && <Badge tone="money">{dinero(l.valor)}</Badge>}
                    {l.canal && <Badge>{l.canal}</Badge>}
                    {d !== null && !['perdido'].includes(l.estado) && (
                      <Badge tone={d < 0 ? 'alert' : d === 0 ? 'gold' : 'neutral'}><CalendarClock className="h-3 w-3" />{d < 0 ? `Vencido ${-d}d` : d === 0 ? 'Hoy' : fechaCorta(l.seguimiento)}</Badge>
                    )}
                  </div>
                  {l.notas && <p className="mt-2 line-clamp-2 text-xs text-ink-400">{l.notas}</p>}
                  {sig && (
                    <button onClick={() => avanzar(l)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-ink-700 py-1.5 text-xs text-ink-300 transition hover:border-gold-500/50 hover:text-gold-300">
                      Mover a {estadoInfo[sig].label} <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
      {estado.leads.length > 0 && lista.length === 0 && <p className="py-8 text-center text-sm text-ink-400">Nada en este filtro.</p>}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar prospecto' : 'Nuevo prospecto'}>
        {edit && <FormLead inicial={edit} onGuardar={guardar} />}
      </Sheet>
    </div>
  )
}

function FormLead({ inicial, onGuardar }: { inicial: Lead; onGuardar: (l: Lead) => void }) {
  const [l, setL] = useState<Lead>(inicial)
  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => setL((x) => ({ ...x, [k]: v }))
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!l.nombre.trim()) return
        onGuardar({ ...l, nombre: l.nombre.trim() })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre *"><input className="input" value={l.nombre} onChange={(e) => set('nombre', e.target.value)} autoFocus placeholder="Dr. Ramírez" /></Field>
        <Field label="Negocio"><input className="input" value={l.negocio} onChange={(e) => set('negocio', e.target.value)} placeholder="Consultorio dental" /></Field>
        <Field label="Contacto"><input className="input" value={l.contacto} onChange={(e) => set('contacto', e.target.value)} placeholder="WhatsApp / @ / correo" /></Field>
        <Field label="Canal">
          <select className="input" value={l.canal} onChange={(e) => set('canal', e.target.value)}>
            {['WhatsApp', 'Instagram', 'Facebook', 'Correo', 'En persona', 'Referido', 'Workana/Fiverr', 'Otro'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Servicio">
          <input className="input" list="servicios" value={l.servicio} onChange={(e) => set('servicio', e.target.value)} placeholder="Landing page" />
          <datalist id="servicios">{IDEAS.map((i) => <option key={i.id} value={i.nombre.split(' (')[0]} />)}</datalist>
        </Field>
        <Field label="Valor del trato (MXN)"><input className="input font-mono" type="number" min="0" inputMode="decimal" value={l.valor || ''} onChange={(e) => set('valor', Number(e.target.value) || 0)} /></Field>
        <Field label="Estado">
          <select className="input" value={l.estado} onChange={(e) => set('estado', e.target.value as EstadoLead)}>
            {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Próximo seguimiento"><input className="input" type="date" value={l.seguimiento} onChange={(e) => set('seguimiento', e.target.value)} /></Field>
      </div>
      <Field label="Notas"><textarea className="input min-h-20" value={l.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Qué le interesa, objeciones, presupuesto…" /></Field>
      <button className="btn-gold w-full" disabled={!l.nombre.trim()}>Guardar</button>
    </form>
  )
}

function Kanban({ leads, onEdit }: { leads: Lead[]; onEdit: (l: Lead) => void }) {
  const { actualizar, marcarActivo } = useStore()
  const [sobre, setSobre] = useState<EstadoLead | null>(null)
  const hoy = hoyISO()
  const mover = (id: string, estado: EstadoLead) => {
    actualizar((s) => ({ ...s, leads: s.leads.map((x) => (x.id === id && x.estado !== estado ? { ...x, estado, actualizado: hoyISO() } : x)) }))
    marcarActivo()
  }
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
      {ESTADOS.map((e) => {
        const col = leads.filter((l) => l.estado === e.id)
        const suma = col.reduce((a, l) => a + (l.valor || 0), 0)
        return (
          <div
            key={e.id}
            onDragOver={(ev) => { ev.preventDefault(); setSobre(e.id) }}
            onDragLeave={() => setSobre(null)}
            onDrop={(ev) => { ev.preventDefault(); setSobre(null); const id = ev.dataTransfer.getData('text/plain'); if (id) mover(id, e.id) }}
            className={cn('flex w-[78vw] max-w-[280px] shrink-0 snap-start flex-col rounded-2xl border bg-ink-900/60 p-2.5 transition sm:w-[260px]', sobre === e.id ? 'border-gold-500/70 bg-gold-500/5' : 'border-ink-700')}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: e.color }} />{e.label}<span className="font-mono text-xs text-ink-500">{col.length}</span></span>
              <span className="font-mono text-xs text-ink-400">{dineroCorto(suma)}</span>
            </div>
            <div className="flex min-h-24 flex-col gap-2">
              {col.map((l) => {
                const d = l.seguimiento ? diffDias(hoy, l.seguimiento) : null
                return (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', l.id); ev.dataTransfer.effectAllowed = 'move' }}
                    className="cursor-grab rounded-xl border border-ink-700 bg-ink-850 p-3 shadow-sm transition hover:border-ink-500 active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => onEdit(l)} className="min-w-0 text-left">
                        <p className="truncate text-sm font-medium">{l.nombre}</p>
                        <p className="truncate text-xs text-ink-400">{l.negocio || l.servicio || '—'}</p>
                      </button>
                      {l.valor > 0 && <span className="shrink-0 font-mono text-xs text-money-400">{dineroCorto(l.valor)}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {d !== null && e.id !== 'perdido' ? (
                        <Badge tone={d < 0 ? 'alert' : d === 0 ? 'gold' : 'neutral'}>{d < 0 ? `Vencido ${-d}d` : d === 0 ? 'Hoy' : fechaCorta(l.seguimiento)}</Badge>
                      ) : <span />}
                      <select
                        aria-label="Mover a etapa"
                        value={l.estado}
                        onChange={(ev) => mover(l.id, ev.target.value as EstadoLead)}
                        className="rounded-lg border border-ink-700 bg-ink-900 px-1.5 py-1 text-[11px] text-ink-300"
                      >
                        {ESTADOS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                      </select>
                    </div>
                  </div>
                )
              })}
              {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-ink-600">Arrastra aquí</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
