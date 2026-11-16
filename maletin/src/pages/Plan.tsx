import { useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Eraser, Plus, Sparkles, Timer, Trash2, Trophy, Wand2 } from 'lucide-react'
import { useStore } from '../store/store'
import { Aviso, Badge, Card, Field, PageHeader, Progress, Segmented, SectionTitle, Stat } from '../components/ui'
import { RitualHoy } from '../components/Ritual'
import { AutoTextarea } from '../components/AutoTextarea'
import { ideaPorId } from '../data/ideas'
import { SPRINTS } from '../data/efectivo'
import { actividadRango, finSprint, ingresosEntre, splitSugerido } from '../lib/acciones'
import { nivelDe, resumenMes } from '../lib/selectores'
import type { EstadoApp, IceItem, NivelPlan, PlanItem, TipoBloque } from '../types'
import { cn, dinero, hoyISO, lunesDe, mesClave, nombreMes, uid } from '../lib/utils'

type Tab = 'hoy' | 'horizontes' | 'ice' | 'semana' | 'revision'

export function Plan({ tabInicial }: { tabInicial?: string }) {
  const [tab, setTab] = useState<Tab>((['hoy', 'horizontes', 'ice', 'semana', 'revision'].includes(tabInicial ?? '') ? tabInicial : 'hoy') as Tab)
  return (
    <div>
      <PageHeader kicker="Planificación por horizontes" title="Plan maestro" sub="Visión a 10 años → metas a 5 años → año → trimestre (OKR) → mes → semana → hoy. Cada nivel conectado con el de arriba." />
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-5"
        options={[
          { id: 'hoy', label: 'Hoy' },
          { id: 'horizontes', label: 'Horizontes' },
          { id: 'ice', label: 'Matriz ICE' },
          { id: 'semana', label: 'Semana' },
          { id: 'revision', label: 'Revisión mensual' },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {tab === 'hoy' && <Hoy />}
          {tab === 'horizontes' && <Horizontes />}
          {tab === 'ice' && <Ice />}
          {tab === 'semana' && <Semana />}
          {tab === 'revision' && <RevisionMensual />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ───────── Hoy ───────── */
function Hoy() {
  const { estado } = useStore()
  const semana = estado.plan.filter((p) => p.nivel === 'semana' && p.periodo === lunesDe())
  const mes = estado.plan.filter((p) => p.nivel === 'mes' && p.periodo === mesClave(hoyISO()))
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card gold className="lg:col-span-3">
        <SectionTitle right={<a href="#/herramientas/enfoque" className="btn-ghost px-3 py-1.5 text-xs"><Timer className="h-3.5 w-3.5" /> Modo enfoque</a>}>Ritual diario</SectionTitle>
        <RitualHoy />
      </Card>
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <SectionTitle>Esta semana sirve a…</SectionTitle>
          {semana.length || mes.length ? (
            <ul className="space-y-2 text-sm">
              {[...semana, ...mes].map((p) => (
                <li key={p.id} className="rounded-xl bg-ink-900/70 px-3 py-2">
                  <span className="label mr-2">{NIVELES[p.nivel].corto}</span>
                  {p.titulo}
                  <Progress className="mt-2" value={progresoDe(p)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-400">Aún no defines metas de este mes ni de esta semana. <a href="#/plan/horizontes" className="text-gold-400 underline">Ir a Horizontes</a>.</p>
          )}
        </Card>
        <Card>
          <SectionTitle>Regla del día</SectionTitle>
          <p className="text-sm text-ink-300">Primero las 3 tareas de dinero (Vía Rápida), después la de Vía Larga, al final el aprendizaje. Si solo puedes hacer una cosa hoy: la primera tarea de dinero.</p>
        </Card>
      </div>
    </div>
  )
}

/* ───────── Horizontes ───────── */
const ORDEN: NivelPlan[] = ['vision', '5a', 'anual', 'trimestre', 'mes', 'semana']
export const NIVELES: Record<NivelPlan, { label: string; corto: string; color: string; ph: string }> = {
  vision: { label: 'Visión a 10 años', corto: 'Visión', color: '#d4af37', ph: 'Ej. A los 28, LKM\'r es un holding con agencia, productos y un portafolio que me da libertad financiera.' },
  '5a': { label: 'Meta a 5 años', corto: '5 años', color: '#e6c260', ph: 'Ej. Agencia con 6 personas y un SaaS con 100 clientes' },
  anual: { label: 'Meta anual', corto: 'Año', color: '#34d399', ph: 'Ej. $25k/mes estables y 5 clientes recurrentes' },
  trimestre: { label: 'OKR trimestral', corto: 'Trimestre', color: '#60a5fa', ph: 'Ej. Tener los primeros 3 clientes con mensualidad' },
  mes: { label: 'Plan del mes', corto: 'Mes', color: '#a78bfa', ph: 'Ej. 2 sprints de 7 días con la oferta de Google Maps' },
  semana: { label: 'Semana', corto: 'Semana', color: '#f472b6', ph: 'Ej. 50 mensajes + 2 cierres' },
}

const periodoDefault = (n: NivelPlan) => {
  const d = new Date()
  const y = d.getFullYear()
  if (n === 'vision') return `${y}–${y + 10}`
  if (n === '5a') return `${y}–${y + 5}`
  if (n === 'anual') return String(y)
  if (n === 'trimestre') return `${y}-T${Math.floor(d.getMonth() / 3) + 1}`
  if (n === 'mes') return mesClave(hoyISO())
  return lunesDe()
}

export const progresoDe = (p: PlanItem) => {
  if (p.krs && p.krs.length) return Math.round(p.krs.reduce((a, k) => a + Math.min(1, k.meta ? k.actual / k.meta : 0), 0) / p.krs.length * 100)
  return p.progreso
}

const plantillaPlan = (): PlanItem[] => {
  const y = new Date().getFullYear()
  const v = uid(), c = uid(), a = uid(), t = uid(), m = uid()
  return [
    { id: v, nivel: 'vision', titulo: 'A los 28 años, LKM\'r es un holding con agencia, productos propios e inversiones que me dan libertad para elegir en qué trabajar.', periodo: `${y}–${y + 10}`, progreso: 0 },
    { id: c, nivel: '5a', padreId: v, titulo: 'Agencia LKM\'r con equipo y procesos + primer producto digital/SaaS con ingresos recurrentes', periodo: `${y}–${y + 5}`, progreso: 0 },
    { id: a, nivel: 'anual', padreId: c, titulo: 'Llegar al Nivel 3 de la escalera: $15k/mes estables sin descuidar la prepa', periodo: String(y + (new Date().getMonth() >= 10 ? 1 : 0)), progreso: 0 },
    { id: t, nivel: 'trimestre', padreId: a, titulo: 'Validar mi oferta principal y conseguir clientes recurrentes', periodo: periodoDefault('trimestre'), progreso: 0, krs: [
      { id: uid(), texto: 'Clientes con mensualidad', actual: 0, meta: 3 },
      { id: uid(), texto: 'Mensajes de prospección', actual: 0, meta: 500 },
      { id: uid(), texto: 'Testimonios reales', actual: 0, meta: 3 },
    ] },
    { id: m, nivel: 'mes', padreId: t, titulo: 'Completar el Protocolo 30 días y un Sprint de 7 días', periodo: periodoDefault('mes'), progreso: 0 },
    { id: uid(), nivel: 'semana', padreId: m, titulo: '50 mensajes, 3 visitas y 1 cierre', periodo: lunesDe(), progreso: 0 },
  ]
}

function Horizontes() {
  const { estado, actualizar } = useStore()
  const items = estado.plan
  const vision = items.find((p) => p.nivel === 'vision')
  const hijos = (id: string) => items.filter((p) => p.padreId === id)
  const ids = new Set(items.map((p) => p.id))
  const huerfanos = items.filter((p) => p.nivel !== 'vision' && (!p.padreId || !ids.has(p.padreId)))

  const upd = (id: string, patch: Partial<PlanItem>) => actualizar((s) => ({ ...s, plan: s.plan.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  const add = (nivel: NivelPlan, padreId?: string) =>
    actualizar((s) => ({ ...s, plan: [...s.plan, { id: uid(), nivel, padreId, titulo: '', periodo: periodoDefault(nivel), progreso: 0, krs: nivel === 'trimestre' ? [{ id: uid(), texto: '', actual: 0, meta: 1 }] : undefined }] }))
  const del = (id: string) => {
    const quitar = new Set<string>([id])
    let cambio = true
    while (cambio) { cambio = false; for (const p of items) if (p.padreId && quitar.has(p.padreId) && !quitar.has(p.id)) { quitar.add(p.id); cambio = true } }
    if (quitar.size > 1 && !confirm(`Esto borra también ${quitar.size - 1} metas conectadas debajo. ¿Continuar?`)) return
    actualizar((s) => ({ ...s, plan: s.plan.filter((p) => !quitar.has(p.id)) }))
  }

  if (!vision) {
    return (
      <Card gold className="text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-gold-400" />
        <h2 className="text-xl font-semibold">Empieza por tu visión a 10 años</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-300">Todo lo demás (año, trimestre, mes, semana y hoy) se conecta hacia arriba con ella. Puedes empezar con una plantilla sugerida y editarla.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="btn-gold" onClick={() => actualizar((s) => ({ ...s, plan: [...plantillaPlan(), ...s.plan.filter((p) => p.nivel !== 'vision')] }))}><Wand2 className="h-4 w-4" /> Usar plantilla sugerida</button>
          <button className="btn-ghost" onClick={() => add('vision')}><Plus className="h-4 w-4" /> Escribir desde cero</button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Nodo item={vision} hijos={hijos} upd={upd} add={add} del={del} />
      {huerfanos.length > 0 && (
        <Card>
          <SectionTitle>Sin conectar</SectionTitle>
          <p className="mb-3 text-xs text-ink-400">Estas metas no tienen un nivel superior. Conéctalas o bórralas.</p>
          <div className="space-y-3">{huerfanos.map((h) => <Nodo key={h.id} item={h} hijos={hijos} upd={upd} add={add} del={del} />)}</div>
        </Card>
      )}
    </div>
  )
}

type NodoProps = {
  item: PlanItem
  hijos: (id: string) => PlanItem[]
  upd: (id: string, p: Partial<PlanItem>) => void
  add: (n: NivelPlan, padre?: string) => void
  del: (id: string) => void
}

function Nodo({ item, hijos, upd, add, del }: NodoProps) {
  const N = NIVELES[item.nivel]
  const sig = ORDEN[ORDEN.indexOf(item.nivel) + 1]
  const hs = hijos(item.id)
  const prog = progresoDe(item)
  return (
    <div>
      <div className={cn(item.nivel === 'vision' ? 'card-gold' : 'card', 'p-3 sm:p-4')} style={{ borderLeft: `3px solid ${N.color}` }}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="label" style={{ color: N.color }}>{N.label}</span>
          <div className="flex items-center gap-2">
            <input className="w-28 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1 font-mono text-xs text-ink-300" value={item.periodo} onChange={(e) => upd(item.id, { periodo: e.target.value })} aria-label="Periodo" />
            <button onClick={() => del(item.id)} className="text-ink-500 hover:text-alert-400" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        <AutoTextarea
          className="w-full bg-transparent text-sm font-medium text-ink-100 outline-none placeholder:text-ink-600 sm:text-base"
          placeholder={N.ph}
          value={item.titulo}
          onChange={(e) => upd(item.id, { titulo: e.target.value })}
          aria-label={N.label}
        />
        {item.nivel === 'trimestre' ? (
          <div className="mt-2 space-y-2">
            <div className="label">Resultados clave</div>
            {(item.krs ?? []).map((k) => (
              <div key={k.id} className="flex flex-wrap items-center gap-2">
                <input className="input min-w-0 flex-1 basis-full py-1.5 text-sm sm:basis-auto" value={k.texto} placeholder="Ej. Clientes con mensualidad" onChange={(e) => upd(item.id, { krs: item.krs!.map((x) => (x.id === k.id ? { ...x, texto: e.target.value } : x)) })} />
                <input className="input w-16 py-1.5 text-center font-mono text-sm" type="number" min="0" value={k.actual} onChange={(e) => upd(item.id, { krs: item.krs!.map((x) => (x.id === k.id ? { ...x, actual: Number(e.target.value) || 0 } : x)) })} aria-label="Actual" />
                <span className="text-xs text-ink-500">/</span>
                <input className="input w-16 py-1.5 text-center font-mono text-sm" type="number" min="1" value={k.meta} onChange={(e) => upd(item.id, { krs: item.krs!.map((x) => (x.id === k.id ? { ...x, meta: Number(e.target.value) || 1 } : x)) })} aria-label="Meta" />
                <button className="text-ink-500 hover:text-alert-400" aria-label="Quitar resultado clave" onClick={() => upd(item.id, { krs: item.krs!.filter((x) => x.id !== k.id) })}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <button className="text-xs text-gold-400 hover:underline" onClick={() => upd(item.id, { krs: [...(item.krs ?? []), { id: uid(), texto: '', actual: 0, meta: 1 }] })}>+ Resultado clave</button>
          </div>
        ) : item.nivel !== 'vision' ? (
          <div className="mt-2 flex items-center gap-3">
            <input type="range" min={0} max={100} step={5} value={item.progreso} onChange={(e) => upd(item.id, { progreso: Number(e.target.value) })} className="w-full accent-[#d4af37]" aria-label="Progreso" />
            <span className="w-10 shrink-0 text-right font-mono text-xs text-ink-300">{item.progreso}%</span>
          </div>
        ) : null}
        {item.nivel === 'trimestre' && <Progress className="mt-2" value={prog} color="money" />}
        {sig && <button onClick={() => add(sig, item.id)} className="mt-2 text-xs text-ink-400 hover:text-gold-300">+ {NIVELES[sig].label}</button>}
      </div>
      {hs.length > 0 && (
        <div className="ml-2 mt-2 space-y-2 border-l border-ink-700 pl-2 sm:ml-4 sm:pl-4">
          {hs.map((h) => <Nodo key={h.id} item={h} hijos={hijos} upd={upd} add={add} del={del} />)}
        </div>
      )}
    </div>
  )
}

/* ───────── Matriz ICE ───────── */
const score = (x: IceItem) => x.i * x.c * x.f

function Ice() {
  const { estado, actualizar } = useStore()
  const [nombre, setNombre] = useState('')
  const lista = [...estado.ice].sort((a, b) => score(b) - score(a))
  const upd = (id: string, p: Partial<IceItem>) => actualizar((s) => ({ ...s, ice: s.ice.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  const agregar = (n: string) => n.trim() && actualizar((s) => ({ ...s, ice: [...s.ice, { id: uid(), nombre: n.trim(), i: 5, c: 5, f: 5 }] }))
  const importar = () => {
    const ya = new Set(estado.ice.map((x) => x.nombre))
    const fuentes = [estado.rutaElegida, ...estado.favoritos].filter(Boolean) as string[]
    const nuevos = [...new Set(fuentes)].map((id) => ideaPorId[id]).filter((i) => i && !ya.has(i.nombre)).map((i) => ({
      id: uid(), nombre: i.nombre, i: Math.min(10, i.escalabilidad * 2), c: 5, f: Math.max(1, 11 - i.dificultad * 2),
    }))
    const prods = estado.productos.filter((p) => p.nombre && !ya.has(p.nombre)).map((p) => ({ id: uid(), nombre: p.nombre, i: 6, c: 4, f: 5 }))
    actualizar((s) => ({ ...s, ice: [...s.ice, ...nuevos, ...prods] }))
  }

  return (
    <div className="space-y-4">
      <Card gold>
        <p className="text-sm text-ink-200"><b className="text-gold-300">ICE = Impacto × Confianza × Facilidad</b> (cada uno del 1 al 10). <span className="text-ink-400">Impacto: cuánto dinero o avance genera. Confianza: qué tan seguro estás de que funciona (¿alguien ya pagó?). Facilidad: qué tan rápido lo haces con lo que tienes.</span></p>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); agregar(nombre); setNombre('') }}>
          <input className="input min-w-0 flex-1" placeholder="Idea o proyecto a evaluar" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <button className="btn-gold"><Plus className="h-4 w-4" /> Agregar</button>
          <button type="button" className="btn-ghost" onClick={importar}>Importar mi ruta, favoritas y productos</button>
        </form>
      </Card>
      {lista.length === 0 && <p className="text-center text-sm text-ink-400">Agrega al menos 3 ideas para compararlas.</p>}
      <div className="space-y-3">
        {lista.map((x, idx) => (
          <Card key={x.id} gold={idx === 0 && lista.length > 1}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-xs text-gold-500">#{idx + 1}</span>
                <input className="min-w-0 bg-transparent font-semibold outline-none" value={x.nombre} onChange={(e) => upd(x.id, { nombre: e.target.value })} aria-label="Nombre" />
                {idx === 0 && lista.length > 1 && <Badge tone="gold"><Trophy className="h-3 w-3" /> Ejecuta primero</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-semibold text-gold-300">{score(x)}</span>
                <button className="text-ink-500 hover:text-alert-400" aria-label="Eliminar" onClick={() => actualizar((s) => ({ ...s, ice: s.ice.filter((y) => y.id !== x.id) }))}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(['i', 'c', 'f'] as const).map((k) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-ink-400">{{ i: 'Impacto', c: 'Confianza', f: 'Facilidad' }[k]}</span><span className="font-mono">{x[k]}</span></div>
                  <input type="range" min={1} max={10} value={x[k]} onChange={(e) => upd(x.id, { [k]: Number(e.target.value) })} className="w-full accent-[#d4af37]" aria-label={k} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ───────── Planificador semanal ───────── */
export const BLOQUES: Record<TipoBloque, { label: string; color: string }> = {
  escuela: { label: 'Escuela', color: '#6f7783' },
  profundo: { label: 'Trabajo profundo', color: '#d4af37' },
  prospeccion: { label: 'Prospección', color: '#f59e0b' },
  entrega: { label: 'Entrega', color: '#34d399' },
  vialarga: { label: 'Vía Larga', color: '#60a5fa' },
  aprendizaje: { label: 'Aprendizaje', color: '#f472b6' },
  ejercicio: { label: 'Ejercicio', color: '#fb7185' },
  descanso: { label: 'Descanso', color: '#a78bfa' },
}
export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const HORAS = Array.from({ length: 17 }, (_, i) => i + 6)

const modeloEstudiante = (): Record<string, TipoBloque> => {
  const s: Record<string, TipoBloque> = {}
  for (let d = 0; d < 5; d++) {
    s[`${d}-6`] = 'ejercicio'
    for (let h = 7; h < 14; h++) s[`${d}-${h}`] = 'escuela'
    s[`${d}-14`] = 'descanso'
    s[`${d}-15`] = 'aprendizaje'
    s[`${d}-16`] = 'aprendizaje'
    s[`${d}-17`] = 'prospeccion'
    s[`${d}-18`] = d % 2 ? 'vialarga' : 'entrega'
    s[`${d}-19`] = 'aprendizaje'
    s[`${d}-20`] = 'descanso'
    s[`${d}-21`] = 'descanso'
  }
  for (let h = 9; h < 13; h++) s[`5-${h}`] = h < 11 ? 'entrega' : 'prospeccion'
  s['5-13'] = 'vialarga'
  s['6-10'] = 'ejercicio'
  s['6-18'] = 'profundo'
  return s
}

function Semana() {
  const { estado, actualizar } = useStore()
  const [pincel, setPincel] = useState<TipoBloque | 'borrar'>('prospeccion')
  const [sobre, setSobre] = useState<string | null>(null)
  const sem = estado.semana
  const set = (fn: (s: Record<string, TipoBloque>) => Record<string, TipoBloque>) => actualizar((st) => ({ ...st, semana: fn({ ...st.semana }) }))

  const pintar = (k: string) =>
    set((s) => {
      if (pincel === 'borrar' || s[k] === pincel) delete s[k]
      else s[k] = pincel
      return s
    })

  const onDrop = (k: string, e: DragEvent) => {
    e.preventDefault()
    setSobre(null)
    const data = e.dataTransfer.getData('text/plain')
    if (!data) return
    set((s) => {
      if (data.startsWith('celda:')) {
        const from = data.slice(6)
        if (from === k || !s[from]) return s
        const t = s[from]
        delete s[from]
        s[k] = t
      } else if (data in BLOQUES) s[k] = data as TipoBloque
      return s
    })
  }

  const totales = useMemo(() => {
    const t: Partial<Record<TipoBloque, number>> = {}
    for (const v of Object.values(sem)) t[v] = (t[v] || 0) + 1
    return t
  }, [sem])
  const rapida = (totales.prospeccion || 0) + (totales.entrega || 0) + (totales.profundo || 0)
  const larga = totales.vialarga || 0
  const pctR = rapida + larga ? Math.round((rapida / (rapida + larga)) * 100) : 0

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(BLOQUES) as TipoBloque[]).map((t) => (
            <button
              key={t}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', t)}
              onClick={() => setPincel(t)}
              className={cn('chip cursor-grab px-3 py-1.5 text-xs', pincel === t ? 'ring-2 ring-offset-2 ring-offset-ink-850' : 'opacity-80')}
              style={{ borderColor: `${BLOQUES[t].color}88`, background: `${BLOQUES[t].color}22`, color: BLOQUES[t].color, ...(pincel === t ? { ['--tw-ring-color' as string]: BLOQUES[t].color } : {}) }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: BLOQUES[t].color }} /> {BLOQUES[t].label} {totales[t] ? <span className="font-mono">{totales[t]}h</span> : null}
            </button>
          ))}
          <button onClick={() => setPincel('borrar')} className={cn('chip px-3 py-1.5 text-xs border-ink-600 text-ink-300', pincel === 'borrar' && 'ring-2 ring-ink-300 ring-offset-2 ring-offset-ink-850')}><Eraser className="h-3 w-3" /> Borrar</button>
        </div>
        <p className="mt-3 text-xs text-ink-400">Toca un tipo y luego las casillas para pintarlas. En computadora también puedes arrastrar un tipo a una casilla, o arrastrar una casilla para moverla.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => (Object.keys(sem).length === 0 || confirm('¿Reemplazar tu semana por el horario modelo de estudiante?')) && actualizar((s) => ({ ...s, semana: modeloEstudiante() }))}><Wand2 className="h-3.5 w-3.5" /> Cargar horario modelo de estudiante</button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => confirm('¿Vaciar toda la semana?') && actualizar((s) => ({ ...s, semana: {} }))}>Vaciar</button>
        </div>
      </Card>

      <div className="card overflow-x-auto p-2 sm:p-3">
        <table className="w-full min-w-[560px] border-separate border-spacing-0.5 text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-10 bg-ink-850" />
              {DIAS.map((d) => <th key={d} className="pb-1 font-medium text-ink-400">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {HORAS.map((h) => (
              <tr key={h}>
                <td className="sticky left-0 z-10 bg-ink-850 pr-1 text-right font-mono text-ink-500">{h}:00</td>
                {DIAS.map((_, d) => {
                  const k = `${d}-${h}`
                  const t = sem[k]
                  return (
                    <td key={k} className="p-0">
                      <button
                        draggable={!!t}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', `celda:${k}`)}
                        onDragOver={(e) => { e.preventDefault(); setSobre(k) }}
                        onDragLeave={() => setSobre(null)}
                        onDrop={(e) => onDrop(k, e)}
                        onClick={() => pintar(k)}
                        aria-label={`${DIAS[d]} ${h}:00 ${t ? BLOQUES[t].label : 'libre'}`}
                        className={cn('h-7 w-full truncate rounded-md px-1 text-left transition', !t && 'bg-ink-900 hover:bg-ink-700', sobre === k && 'ring-2 ring-gold-400')}
                        style={t ? { background: `${BLOQUES[t].color}30`, color: BLOQUES[t].color, borderLeft: `2px solid ${BLOQUES[t].color}` } : undefined}
                      >
                        {t ? BLOQUES[t].label : ''}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><Stat label="Horas Vía Rápida" value={`${rapida} h`} tone="gold" sub="prospección + entrega + profundo" /></Card>
        <Card><Stat label="Horas Vía Larga" value={`${larga} h`} sub="activos" /></Card>
        <Card>
          <Stat label="Proporción real" value={`${pctR}/${rapida + larga ? 100 - pctR : 0}`} sub={`Tu objetivo: ${estado.config.pctTiempoRapida}/${100 - estado.config.pctTiempoRapida}`} />
        </Card>
      </div>
      {(totales.descanso || 0) < 7 && Object.keys(sem).length > 20 && <Aviso>Tienes menos de 7 horas de descanso marcadas en la semana. El protocolo anti-burnout pide al menos un día libre completo.</Aviso>}
    </div>
  )
}

/* ───────── Revisión mensual ───────── */
export const metricasMes = (e: EstadoApp, mes: string) => {
  const r = resumenMes(e, mes)
  const movs = e.movimientos.filter((m) => m.tipo === 'ingreso' && mesClave(m.fecha) === mes)
  const rapida = movs.filter((m) => m.via !== 'larga').reduce((a, m) => a + m.monto, 0)
  const larga = movs.filter((m) => m.via === 'larga').reduce((a, m) => a + m.monto, 0)
  const nuevos = e.leads.filter((l) => ['cerrado', 'recurrente'].includes(l.estado) && mesClave(l.actualizado) === mes).length
  const act = actividadRango(e, `${mes}-01`, `${mes}-31`)
  const aportado = e.fondoLargo.filter((a) => a.monto > 0 && mesClave(a.fecha) === mes).reduce((x, a) => x + a.monto, 0)
  const sprints = e.sprints.filter((s) => mesClave(hoyISO(new Date(s.inicio))) === mes)
  const sprintsOk = sprints.filter((s) => ingresosEntre(e, s.inicio, finSprint(s)) >= s.meta).length
  return { ...r, rapida, larga, nuevos, act, aportado, sprints: sprints.length, sprintsOk }
}

function RevisionMensual() {
  const { estado, actualizar } = useStore()
  const { n } = nivelDe(estado)
  const [mes, setMes] = useState(mesClave(hoyISO()))
  const existente = estado.revisionesMes.find((r) => r.mes === mes)
  const [f, setF] = useState(() => existente ?? { id: '', mes, funciono: '', noFunciono: '', ajustes: '', metaSiguiente: estado.config.metaMes, creada: hoyISO() })
  const [aplicar, setAplicar] = useState(true)
  const m = metricasMes(estado, mes)

  const cambiarMes = (x: string) => {
    setMes(x)
    const e = estado.revisionesMes.find((r) => r.mes === x)
    setF(e ?? { id: '', mes: x, funciono: '', noFunciono: '', ajustes: '', metaSiguiente: estado.config.metaMes, creada: hoyISO() })
  }

  const guardar = () => {
    const fin = { ...f, mes, id: f.id || uid() }
    actualizar((s) => ({
      ...s,
      revisionesMes: [...s.revisionesMes.filter((r) => r.mes !== mes), fin],
      config: aplicar ? { ...s.config, metaMes: fin.metaSiguiente } : s.config,
    }))
    setF(fin)
  }

  const meses = [...new Set([mesClave(hoyISO()), ...estado.movimientos.map((x) => mesClave(x.fecha)), ...estado.revisionesMes.map((r) => r.mes)])].sort().reverse()
  const sug = splitSugerido(n)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto py-2" value={mes} onChange={(e) => cambiarMes(e.target.value)} aria-label="Mes">{meses.map((x) => <option key={x} value={x}>{nombreMes(x)}</option>)}</select>
        {existente && <Badge tone="money">Revisión guardada</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><Stat label="Ingresos" value={dinero(m.ingresos)} tone="money" sub={`Rápida ${dinero(m.rapida)} · Larga ${dinero(m.larga)}`} /></Card>
        <Card><Stat label="Neto" value={dinero(m.neto)} tone="gold" sub={`Gastos ${dinero(m.gastos)}`} /></Card>
        <Card><Stat label="Clientes cerrados" value={m.nuevos} sub={`${m.act.mensajes} mensajes · ${m.act.cierres} cierres`} /></Card>
        <Card><Stat label="A Vía Larga" value={dinero(m.aportado)} sub={`Sprints: ${m.sprintsOk}/${m.sprints} con meta`} /></Card>
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="¿Qué funcionó? (duplícalo)"><textarea className="input min-h-24" value={f.funciono} onChange={(e) => setF({ ...f, funciono: e.target.value })} /></Field>
          <Field label="¿Qué no funcionó? (córtalo o cámbialo)"><textarea className="input min-h-24" value={f.noFunciono} onChange={(e) => setF({ ...f, noFunciono: e.target.value })} /></Field>
          <Field label="Ajustes al plan para el siguiente mes"><textarea className="input min-h-24" value={f.ajustes} onChange={(e) => setF({ ...f, ajustes: e.target.value })} placeholder="Ej. Cambiar de nicho a consultorios, subir precio 20%, 1 sprint de 7 días la primera semana" /></Field>
          <div className="space-y-3">
            <Field label="Meta de ingresos del siguiente mes (MXN)" hint={m.ingresos ? `Referencia: este mes hiciste ${dinero(m.ingresos)}. Una meta sana suele ser +10–30%.` : undefined}>
              <input className="input font-mono" type="number" min="0" value={f.metaSiguiente} onChange={(e) => setF({ ...f, metaSiguiente: Number(e.target.value) || 0 })} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink-300"><input type="checkbox" checked={aplicar} onChange={(e) => setAplicar(e.target.checked)} className="accent-[#d4af37]" /> Usarla como meta en la Sala de guerra</label>
            <p className="rounded-xl bg-ink-900/80 p-3 text-xs text-ink-300">Tiempo actual {estado.config.pctTiempoRapida}/{100 - estado.config.pctTiempoRapida} (rápida/larga). Sugerido para tu nivel: {sug}/{100 - sug}. Ajusta en <a href="#/imperio/fondo" className="text-gold-400 underline">Fondo Vía Larga</a>.</p>
          </div>
        </div>
        <button className="btn-gold mt-4" onClick={guardar}>Guardar revisión de {nombreMes(mes)}</button>
      </Card>
      {estado.revisionesMes.length > 0 && (
        <Card>
          <SectionTitle>Historial</SectionTitle>
          <ul className="space-y-2 text-sm">
            {[...estado.revisionesMes].sort((a, b) => b.mes.localeCompare(a.mes)).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink-900/70 px-3 py-2">
                <button className="text-left" onClick={() => cambiarMes(r.mes)}>{nombreMes(r.mes)} · <span className="text-ink-400">meta siguiente {dinero(r.metaSiguiente)}</span></button>
                <button className="text-ink-500 hover:text-alert-400" aria-label="Eliminar" onClick={() => actualizar((s) => ({ ...s, revisionesMes: s.revisionesMes.filter((x) => x.id !== r.id) }))}><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="text-xs text-ink-500">Sprint de referencia: {SPRINTS['7d'].nombre} — úsalo la primera semana de cada mes para arrancar con impulso.</p>
    </div>
  )
}
