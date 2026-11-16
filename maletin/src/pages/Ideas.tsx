import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Lock, Search, SlidersHorizontal, Star, Wallet } from 'lucide-react'
import { useStore } from '../store/store'
import { Badge, Card, Dots, PageHeader } from '../components/ui'
import { IDEAS } from '../data/ideas'
import { CATEGORIAS, categoriaPorId } from '../data/categorias'
import type { CategoriaId, Idea, Modalidad } from '../types'
import { cn, rango } from '../lib/utils'

type FCap = 'todos' | '0' | '500'
type FTiempo = 'todos' | '7' | '30'
type FMod = 'todos' | Modalidad
type Orden = 'recomendado' | 'rapido' | 'escala' | 'facil'

export function Ideas() {
  const { estado } = useStore()
  const [cat, setCat] = useState<CategoriaId | 'todas' | 'fav'>('todas')
  const [q, setQ] = useState('')
  const [cap, setCap] = useState<FCap>('todos')
  const [tiempo, setTiempo] = useState<FTiempo>('todos')
  const [mod, setMod] = useState<FMod>('todos')
  const [escMin, setEscMin] = useState(1)
  const [orden, setOrden] = useState<Orden>('recomendado')
  const [verFiltros, setVerFiltros] = useState(false)

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    const r = IDEAS.filter((i) => {
      if (cat === 'fav' && !estado.favoritos.includes(i.id)) return false
      if (cat !== 'todas' && cat !== 'fav' && i.categoria !== cat) return false
      if (cap !== 'todos' && i.capital[0] > Number(cap)) return false
      if (tiempo !== 'todos' && i.diasPrimerPeso[0] > Number(tiempo)) return false
      if (mod !== 'todos' && i.modalidad !== mod && !(i.modalidad === 'mixto')) return false
      if (i.escalabilidad < escMin) return false
      if (t && !`${i.nombre} ${i.resumen} ${i.cliente}`.toLowerCase().includes(t)) return false
      return true
    })
    const s = [...r]
    if (orden === 'rapido') s.sort((a, b) => a.diasPrimerPeso[0] - b.diasPrimerPeso[0])
    if (orden === 'escala') s.sort((a, b) => b.escalabilidad - a.escalabilidad)
    if (orden === 'facil') s.sort((a, b) => a.dificultad - b.dificultad)
    if (orden === 'recomendado') s.sort((a, b) => (a.nivelMin ?? 1) - (b.nivelMin ?? 1))
    return s
  }, [cat, q, cap, tiempo, mod, escMin, orden, estado.favoritos])

  const filtrosActivos = [cap !== 'todos', tiempo !== 'todos', mod !== 'todos', escMin > 1].filter(Boolean).length

  return (
    <div>
      <PageHeader kicker="Sección 2 · El corazón" title="Catálogo de ideas" sub={`${IDEAS.length} fichas completas. Empieza por las de nivel 1 (capital $0–$500, dinero rápido) y deja las de escala para cuando llegues ahí.`} />

      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input className="input pl-9" placeholder="Buscar: video, restaurantes, PC…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={() => setVerFiltros((v) => !v)} className={cn('btn-ghost relative', verFiltros && 'border-gold-500/60')}>
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {filtrosActivos > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">{filtrosActivos}</span>}
        </button>
      </div>

      {verFiltros && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 overflow-hidden">
          <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Filtro label="Capital inicial" value={cap} onChange={setCap} opciones={[['todos', 'Cualquiera'], ['0', '$0'], ['500', 'Hasta $500']]} />
            <Filtro label="Primer peso" value={tiempo} onChange={setTiempo} opciones={[['todos', 'Cualquiera'], ['7', '≤ 7 días'], ['30', '≤ 30 días']]} />
            <Filtro label="Modalidad" value={mod} onChange={setMod} opciones={[['todos', 'Todas'], ['online', 'En línea'], ['local', 'Local']]} />
            <Filtro label="Escalabilidad mín." value={String(escMin)} onChange={(v) => setEscMin(Number(v))} opciones={[['1', 'Cualquiera'], ['3', '3+'], ['4', '4+'], ['5', '5']]} />
            <Filtro label="Ordenar" value={orden} onChange={setOrden} opciones={[['recomendado', 'Por etapa'], ['rapido', 'Más rápido'], ['facil', 'Más fácil'], ['escala', 'Más escalable']]} />
          </Card>
        </motion.div>
      )}

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Tab activo={cat === 'todas'} onClick={() => setCat('todas')}>Todas</Tab>
        <Tab activo={cat === 'fav'} onClick={() => setCat('fav')}><Star className="h-3.5 w-3.5" /> Favoritas</Tab>
        {CATEGORIAS.map((c) => (
          <Tab key={c.id} activo={cat === c.id} onClick={() => setCat(c.id)} color={c.color}>{c.corto}</Tab>
        ))}
      </div>

      {cat !== 'todas' && cat !== 'fav' && <p className="mb-4 max-w-3xl text-sm text-ink-300">{categoriaPorId[cat].descripcion}</p>}

      <p className="mb-3 text-xs text-ink-500">{lista.length} ideas · ingresos = rangos estimados por mes, no promesas</p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((i, k) => (
          <TarjetaIdea key={i.id} idea={i} k={k} fav={estado.favoritos.includes(i.id)} mia={estado.rutaElegida === i.id} />
        ))}
      </div>
      {lista.length === 0 && <p className="py-10 text-center text-ink-400">Ninguna idea con esos filtros.</p>}
    </div>
  )
}

function TarjetaIdea({ idea, k, fav, mia }: { idea: Idea; k: number; fav: boolean; mia: boolean }) {
  const c = categoriaPorId[idea.categoria]
  const bloqueada = (idea.nivelMin ?? 1) > 1
  return (
    <motion.a
      href={`#/idea/${idea.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(k, 12) * 0.025 }}
      className={cn('card group relative flex flex-col overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-gold-600/50', mia && 'border-money-500/60')}
    >
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }} />
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: c.color }}>{c.corto}</span>
        <div className="flex items-center gap-1.5">
          {mia && <Badge tone="money">Mi ruta</Badge>}
          {bloqueada && <Badge tone="neutral"><Lock className="h-3 w-3" /> Nivel {idea.nivelMin}+</Badge>}
          {fav && <Star className="h-4 w-4 fill-gold-500 text-gold-500" />}
        </div>
      </div>
      <h3 className="font-semibold leading-snug text-ink-100 group-hover:text-gold-200">{idea.nombre}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-ink-400">{idea.resumen}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-300">
        <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5 text-ink-500" />{idea.capital[1] === 0 ? '$0' : rango(idea.capital)}</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-ink-500" />{idea.diasPrimerPeso[0]}–{idea.diasPrimerPeso[1]} días</span>
        <span className="capitalize">{idea.modalidad === 'mixto' ? 'Online + local' : idea.modalidad === 'online' ? 'En línea' : 'Local'}</span>
      </div>
      <div className="mt-3 space-y-1.5 border-t border-ink-700/70 pt-3">
        <Dots label="Dificultad" value={idea.dificultad} />
        <Dots label="Escalabilidad" value={idea.escalabilidad} />
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-xs text-ink-500">Arranque → escalado</span>
        <span className="font-mono text-xs text-money-400">{rango(idea.ingresos.arranque)} → {rango(idea.ingresos.escalado)}</span>
      </div>
    </motion.a>
  )
}

function Tab({ activo, onClick, children, color }: { activo: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button onClick={onClick} className={cn('chip shrink-0 px-3 py-1.5 text-sm', activo ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-500')}>
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  )
}

function Filtro<T extends string>({ label, value, onChange, opciones }: { label: string; value: T; onChange: (v: T) => void; opciones: [T, string][] }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      <select className="input py-2" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {opciones.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  )
}
