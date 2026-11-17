import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, Clock, Flag, MapPin, Minus, Plus, Rocket, Save, Timer, Trash2, Zap } from 'lucide-react'
import { useStore } from '../store/store'
import { Badge, Card, CheckRow, Field, PageHeader, Progress, Segmented, SectionTitle, Stat } from '../components/ui'
import { Copiar } from '../components/Copiar'
import { VentaRapida } from '../components/VentaRapida'
import { MAPA_LOCAL, OFERTAS_EXPRESS, SPRINTS } from '../data/efectivo'
import type { Actividad, OfertaGuardada, TipoSprint } from '../types'
import { actividadDe, actividadRango, avanceSprint, finSprint, sprintActivo, sumarActividad, ingresosEntre } from '../lib/acciones'
import { useNow } from '../lib/useNow'
import { cn, dinero, duracionTexto, fechaCorta, hoyISO, lunesDe, sumarDias, uid } from '../lib/utils'
import { confirmar } from '../components/Confirmar'

type Tab = 'sprints' | 'ofertas' | 'constructor' | 'mapa' | 'actividad'

export function Efectivo({ tabInicial }: { tabInicial?: string }) {
  const [tab, setTab] = useState<Tab>((['sprints', 'ofertas', 'constructor', 'mapa', 'actividad'].includes(tabInicial ?? '') ? tabInicial : 'sprints') as Tab)
  return (
    <div>
      <PageHeader kicker="Vía Rápida" title="Modo Efectivo" sub="Dinero en días o semanas, sin capital. Paga las cuentas, financia la Vía Larga y te da confianza." />
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-5"
        options={[
          { id: 'sprints', label: 'Sprints' },
          { id: 'ofertas', label: 'Ofertas express' },
          { id: 'constructor', label: 'Constructor' },
          { id: 'mapa', label: 'Mapa local' },
          { id: 'actividad', label: 'Actividad' },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {tab === 'sprints' && <Sprints />}
          {tab === 'ofertas' && <Ofertas />}
          {tab === 'constructor' && <Constructor />}
          {tab === 'mapa' && <Mapa />}
          {tab === 'actividad' && <ActividadTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ───────── Sprints ───────── */
function Sprints() {
  const { estado, actualizar, marcarActivo } = useStore()
  const now = useNow(1000)
  const activo = sprintActivo(estado)
  const [tipo, setTipo] = useState<TipoSprint>('72h')
  const [meta, setMeta] = useState(String(SPRINTS['72h'].meta))
  const [oferta, setOferta] = useState(OFERTAS_EXPRESS[0].id)

  const iniciar = () => {
    const m = Number(meta) || SPRINTS[tipo].meta
    actualizar((s) => ({ ...s, sprints: [...s.sprints, { id: uid(), tipo, meta: m, inicio: Date.now(), checks: {}, oferta }] }))
    marcarActivo()
  }

  const historial = [...estado.sprints].reverse().filter((sp) => sp.id !== activo?.id)

  if (activo) {
    const def = SPRINTS[activo.tipo]
    const restante = finSprint(activo) - now
    const ganado = avanceSprint(estado, activo)
    const items = def.pasos.flatMap((p) => p.items.map((i) => `${p.id}:${i.id}`))
    const hechos = items.filter((k) => activo.checks[k]).length
    const of = OFERTAS_EXPRESS.find((o) => o.id === activo.oferta)
    const toggle = (k: string) => {
      const v = !activo.checks[k]
      actualizar((s) => ({ ...s, sprints: s.sprints.map((x) => (x.id === activo.id ? { ...x, checks: { ...x.checks, [k]: v } } : x)) }))
      if (v) marcarActivo()
    }
    return (
      <div className="space-y-5">
        <Card gold>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="label mb-1 flex items-center gap-2"><Rocket className="h-3.5 w-3.5 text-gold-500" /> Sprint activo</div>
              <h2 className="text-xl font-semibold">{def.nombre}</h2>
              {of && <p className="mt-1 text-sm text-ink-300">Oferta: <span className="text-gold-300">{of.nombre}</span></p>}
            </div>
            <div className="text-right">
              <div className="label">Tiempo restante</div>
              <div className="font-mono text-3xl font-semibold tabular-nums text-gold-300">{duracionTexto(restante)}</div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Stat label="Ganado" value={dinero(ganado)} tone="money" sub={`Meta ${dinero(activo.meta)}`} />
            <Stat label="Avance de meta" value={`${Math.min(100, Math.round((ganado / activo.meta) * 100))}%`} />
            <Stat label="Checklist" value={`${hechos}/${items.length}`} />
          </div>
          <Progress className="mt-4" value={ganado} max={activo.meta} color="money" />
          <div className="mt-5 border-t border-ink-700/70 pt-4">
            <div className="label mb-2">Registrar venta del sprint</div>
            <VentaRapida />
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          {def.pasos.map((p) => (
            <Card key={p.id}>
              <SectionTitle>{p.dia}</SectionTitle>
              <div className="-mx-2">
                {p.items.map((i) => (
                  <CheckRow key={i.id} checked={!!activo.checks[`${p.id}:${i.id}`]} onToggle={() => toggle(`${p.id}:${i.id}`)}>{i.texto}</CheckRow>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {of && <OfertaCard o={of} abiertaInicial />}

        <button
          className="btn-ghost"
          onClick={() => void confirmar('¿Cerrar el sprint antes de tiempo? Se guarda en tu historial.').then((ok) => ok && actualizar((s) => ({ ...s, sprints: s.sprints.map((x) => (x.id === activo.id ? { ...x, cerrado: true } : x)) })))}
        >
          <Flag className="h-4 w-4" /> Cerrar sprint
        </button>
        <Historial items={historial} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(SPRINTS) as TipoSprint[]).map((t) => {
          const d = SPRINTS[t]
          const on = tipo === t
          return (
            <button key={t} onClick={() => { setTipo(t); setMeta(String(d.meta)) }} className={cn(on ? 'card-gold' : 'card', 'p-5 text-left transition hover:-translate-y-0.5')}>
              <div className="flex items-center justify-between">
                <Badge tone={on ? 'gold' : 'neutral'}><Timer className="h-3 w-3" />{t}</Badge>
                <span className="font-mono text-sm text-money-400">meta {dinero(d.meta)}</span>
              </div>
              <h3 className="mt-3 font-semibold">{d.nombre}</h3>
              <p className="mt-1 text-sm text-ink-400">{d.resumen}</p>
            </button>
          )
        })}
      </div>
      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Meta del sprint (MXN)" hint="Estimación personal, no promesa.">
            <input className="input font-mono" type="number" min="0" value={meta} onChange={(e) => setMeta(e.target.value)} />
          </Field>
          <Field label="Oferta principal">
            <select className="input" value={oferta} onChange={(e) => setOferta(e.target.value)}>
              {OFERTAS_EXPRESS.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <button onClick={iniciar} className="btn-gold w-full"><Zap className="h-4 w-4" /> Iniciar {SPRINTS[tipo].nombre}</button>
          </div>
        </div>
      </Card>
      <Historial items={historial} />
    </div>
  )
}

function Historial({ items }: { items: ReturnType<typeof useStore>['estado']['sprints'] }) {
  const { estado } = useStore()
  if (!items.length) return null
  return (
    <Card>
      <SectionTitle>Historial de sprints</SectionTitle>
      <ul className="divide-y divide-ink-700/60">
        {items.slice(0, 10).map((sp) => {
          const g = ingresosEntre(estado, sp.inicio, finSprint(sp))
          const ok = g >= sp.meta
          return (
            <li key={sp.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span>{SPRINTS[sp.tipo].nombre} · <span className="text-ink-400">{fechaCorta(hoyISO(new Date(sp.inicio)))}</span></span>
              <span className="flex items-center gap-2">
                <span className="font-mono">{dinero(g)} / {dinero(sp.meta)}</span>
                <Badge tone={ok ? 'money' : 'neutral'}>{ok ? 'Meta lograda' : 'Aprendizaje'}</Badge>
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* ───────── Ofertas express ───────── */
function Ofertas() {
  const [f, setF] = useState<'todas' | 'digital' | 'tecnico' | 'comercio' | 'educacion'>('todas')
  const lista = OFERTAS_EXPRESS.filter((o) => f === 'todas' || o.tipo === f)
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-300">{OFERTAS_EXPRESS.length} ofertas que se venden y entregan en menos de 48 h. Precios orientativos para Aguascalientes.</p>
        <select className="input w-auto py-2" value={f} onChange={(e) => setF(e.target.value as typeof f)} aria-label="Filtrar">
          <option value="todas">Todas</option>
          <option value="digital">Digitales</option>
          <option value="tecnico">Técnicas</option>
          <option value="comercio">Comercio</option>
          <option value="educacion">Educación</option>
        </select>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {lista.map((o) => <OfertaCard key={o.id} o={o} />)}
      </div>
    </div>
  )
}

function OfertaCard({ o, abiertaInicial }: { o: (typeof OFERTAS_EXPRESS)[number]; abiertaInicial?: boolean }) {
  const [open, setOpen] = useState(!!abiertaInicial)
  return (
    <div className={cn(open ? 'card-gold' : 'card', 'self-start overflow-hidden')}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="font-semibold">{o.nombre}</p>
          <p className="mt-0.5 text-sm text-ink-400">{o.que}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-sm text-money-400">{o.precio}</span>
          <ChevronDown className={cn('h-4 w-4 text-ink-400 transition', open && 'rotate-180')} />
        </div>
      </button>
      {open && (
        <div className="space-y-4 border-t border-ink-700/70 p-4 text-sm">
          <div><div className="label mb-1">A quién en Aguascalientes</div><p className="text-ink-200">{o.aQuien}</p></div>
          <div>
            <div className="mb-1 flex items-center justify-between"><span className="label">Guion de venta</span><Copiar texto={o.guion} /></div>
            <p className="rounded-xl bg-ink-950/70 p-3 leading-relaxed text-ink-200">{o.guion}</p>
          </div>
          <div>
            <div className="label mb-1 flex items-center gap-1.5"><Clock className="h-3 w-3" /> Entrega en menos de 48 h</div>
            <ol className="space-y-1 text-ink-300">{o.entrega.map((e, i) => <li key={e}><span className="font-mono text-gold-400">{i + 1}.</span> {e}</li>)}</ol>
          </div>
          <div><div className="label mb-1">Convertirlo en recurrente</div><p className="text-money-300">{o.recurrente}</p></div>
          {o.ideaId && <a href={`#/idea/${o.ideaId}`} className="text-xs text-gold-400 hover:underline">Ver ficha completa en el catálogo →</a>}
        </div>
      )}
    </div>
  )
}

/* ───────── Constructor de ofertas ───────── */
const vacia = (): OfertaGuardada => ({ id: '', cliente: '', resultado: '', plazo: '', bonus: '', garantia: '', precio: 0, ancla: '', urgencia: '', creada: hoyISO() })

export const textoOferta = (o: OfertaGuardada) =>
  [
    `Hola, ${o.cliente ? `vi que ${o.cliente.toLowerCase()} suelen batallar con esto, así que` : ''} te propongo algo concreto:`,
    '',
    `✅ ${o.resultado || '[Resultado que vas a lograr]'}`,
    `⏱️ Listo en ${o.plazo || '[plazo]'}`,
    o.bonus ? `🎁 Bonus: ${o.bonus}` : '',
    o.garantia ? `🛡️ Garantía: ${o.garantia}` : '',
    '',
    `Inversión: ${o.precio ? dinero(o.precio) : '$[precio]'} MXN${o.ancla ? ` (${o.ancla})` : ''}.`,
    o.urgencia ? `${o.urgencia}` : '',
    '',
    '¿Lo arrancamos? Con 50% de anticipo aparto tu lugar.',
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')

function Constructor() {
  const { estado, actualizar } = useStore()
  const [o, setO] = useState<OfertaGuardada>(vacia)
  const set = <K extends keyof OfertaGuardada>(k: K, v: OfertaGuardada[K]) => setO((x) => ({ ...x, [k]: v }))
  const texto = textoOferta(o)
  const puntos = [o.resultado, o.plazo, o.bonus, o.garantia, o.precio > 0, o.ancla, o.urgencia].filter(Boolean).length

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <SectionTitle>Arma tu oferta irresistible</SectionTitle>
        <div className="space-y-3">
          <Field label="¿A quién? (tipo de cliente)"><input className="input" value={o.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Ej. Las barberías de Jesús María" /></Field>
          <Field label="Resultado prometido (concreto, medible, realista)"><input className="input" value={o.resultado} onChange={(e) => set('resultado', e.target.value)} placeholder="Ej. Tus clientes reservan solos por internet, con recordatorio" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plazo"><input className="input" value={o.plazo} onChange={(e) => set('plazo', e.target.value)} placeholder="48 horas" /></Field>
            <Field label="Precio (MXN)"><input className="input font-mono" type="number" min="0" value={o.precio || ''} onChange={(e) => set('precio', Number(e.target.value) || 0)} /></Field>
          </div>
          <Field label="Bonus (algo de alto valor y bajo costo para ti)"><input className="input" value={o.bonus} onChange={(e) => set('bonus', e.target.value)} placeholder="Ej. QR impreso para el mostrador" /></Field>
          <Field label="Garantía (que puedas cumplir)"><input className="input" value={o.garantia} onChange={(e) => set('garantia', e.target.value)} placeholder="Ej. Si no te gusta, 2 rondas de cambios sin costo" /></Field>
          <Field label="Ancla de valor"><input className="input" value={o.ancla} onChange={(e) => set('ancla', e.target.value)} placeholder="Ej. menos de lo que cuesta un cliente nuevo" /></Field>
          <Field label="Urgencia honesta"><input className="input" value={o.urgencia} onChange={(e) => set('urgencia', e.target.value)} placeholder="Ej. Solo tomo 3 proyectos esta semana por la escuela." /></Field>
        </div>
      </Card>
      <div className="space-y-4">
        <Card gold>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Vista previa</SectionTitle>
            <Badge tone={puntos >= 6 ? 'money' : 'gold'}>Fuerza {puntos}/7</Badge>
          </div>
          <pre className="whitespace-pre-wrap rounded-xl border border-ink-700 bg-ink-950/70 p-4 font-sans text-sm leading-relaxed text-ink-200">{texto}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Copiar texto={texto} label="Copiar mensaje" />
            <button
              className="btn-gold px-3 py-1.5 text-xs"
              disabled={!o.resultado}
              onClick={() => { actualizar((s) => ({ ...s, ofertas: [{ ...o, id: uid(), creada: hoyISO() }, ...s.ofertas] })); setO(vacia()) }}
            >
              <Save className="h-3.5 w-3.5" /> Guardar oferta
            </button>
          </div>
          <ul className="mt-4 space-y-1 text-xs text-ink-400">
            <li>· Promete solo lo que controlas (entrega, calidad, plazo), no ventas.</li>
            <li>· La urgencia debe ser real. Nada de "últimos lugares" falsos.</li>
          </ul>
        </Card>
        {estado.ofertas.length > 0 && (
          <Card>
            <SectionTitle>Ofertas guardadas</SectionTitle>
            <ul className="space-y-2">
              {estado.ofertas.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink-900/70 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{x.resultado} <span className="text-ink-500">· {x.precio ? dinero(x.precio) : ''}</span></span>
                  <span className="flex shrink-0 gap-1">
                    <Copiar texto={textoOferta(x)} label="" className="px-2" />
                    <button className="btn-ghost px-2 py-1.5" aria-label="Eliminar" onClick={() => actualizar((s) => ({ ...s, ofertas: s.ofertas.filter((y) => y.id !== x.id) }))}><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}

/* ───────── Mapa local ───────── */
function Mapa() {
  const of = Object.fromEntries(OFERTAS_EXPRESS.map((o) => [o.id, o]))
  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm text-ink-300">Dónde están tus clientes en Jesús María y Aguascalientes, qué les duele y qué oferta les encaja. Úsalo para elegir la categoría de tu próximo sprint.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {MAPA_LOCAL.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="h-full">
              <h3 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-gold-500" />{c.nombre}</h3>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div><dt className="label">Dónde</dt><dd className="text-ink-300">{c.donde}</dd></div>
                <div><dt className="label">Dolor típico</dt><dd className="text-alert-400/90">{c.dolor}</dd></div>
                <div><dt className="label">Gancho</dt><dd className="text-ink-200">{c.gancho}</dd></div>
                <div><dt className="label">Mejor momento</dt><dd className="text-ink-300">{c.mejorHora}</dd></div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.ofertas.map((id) => of[id] && <Badge key={id} tone="gold">{of[id].nombre}</Badge>)}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ───────── Contador de actividad ───────── */
const CAMPOS: { k: keyof Actividad; label: string }[] = [
  { k: 'mensajes', label: 'Mensajes' },
  { k: 'respuestas', label: 'Respuestas' },
  { k: 'llamadas', label: 'Llamadas/visitas' },
  { k: 'cotizaciones', label: 'Cotizaciones' },
  { k: 'cierres', label: 'Cierres' },
]

export function ContadorActividad({ compacto }: { compacto?: boolean }) {
  const { estado, actualizar, marcarActivo } = useStore()
  const hoy = actividadDe(estado)
  const sumar = (k: keyof Actividad, n: number) => {
    actualizar((s) => sumarActividad(s, k, n))
    if (n > 0) marcarActivo()
  }
  return (
    <div className={cn('grid gap-2', compacto ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-5')}>
      {CAMPOS.map(({ k, label }) => (
        <div key={k} className="rounded-xl border border-ink-700 bg-ink-900/70 p-2 text-center">
          <div className="truncate text-[10px] text-ink-400 sm:text-xs">{label}</div>
          <div className="my-1 font-mono text-xl font-semibold tabular-nums">{hoy[k]}</div>
          <div className="flex justify-center gap-1">
            <button onClick={() => sumar(k, -1)} className="grid h-7 w-7 place-items-center rounded-lg border border-ink-600 text-ink-300 hover:bg-ink-700" aria-label={`Restar ${label}`}><Minus className="h-3.5 w-3.5" /></button>
            <button onClick={() => sumar(k, 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-gold-500 text-ink-950 hover:bg-gold-400" aria-label={`Sumar ${label}`}><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ))}
    </div>
  )
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')

function ActividadTab() {
  const { estado } = useStore()
  const hoy = actividadDe(estado)
  const lunes = lunesDe()
  const sem = actividadRango(estado, lunes, sumarDias(lunes, 6))
  const serie = useMemo(() => {
    const out = []
    for (let i = 13; i >= 0; i--) {
      const f = sumarDias(hoyISO(), -i)
      const a = actividadDe(estado, f)
      out.push({ dia: fechaCorta(f), Mensajes: a.mensajes, Cierres: a.cierres })
    }
    return out
  }, [estado])

  return (
    <div className="space-y-5">
      <Card gold>
        <SectionTitle>Hoy</SectionTitle>
        <ContadorActividad />
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <div><div className="label">Respuesta</div><div className="font-mono text-lg text-gold-300">{pct(hoy.respuestas, hoy.mensajes)}</div></div>
          <div><div className="label">Cierre / cotización</div><div className="font-mono text-lg text-gold-300">{pct(hoy.cierres, hoy.cotizaciones)}</div></div>
          <div><div className="label">Cierre / mensaje</div><div className="font-mono text-lg text-money-400">{pct(hoy.cierres, hoy.mensajes)}</div></div>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <SectionTitle>Esta semana</SectionTitle>
          <ul className="space-y-2 text-sm">
            {CAMPOS.map(({ k, label }) => <li key={k} className="flex justify-between"><span className="text-ink-300">{label}</span><span className="font-mono">{sem[k]}</span></li>)}
          </ul>
          <div className="mt-4 rounded-xl bg-ink-900/80 p-3 text-xs text-ink-300">
            Tasa de respuesta {pct(sem.respuestas, sem.mensajes)} · Conversión global {pct(sem.cierres, sem.mensajes)}.
            {sem.mensajes >= 20 && sem.respuestas / sem.mensajes < 0.1 && <span className="mt-1 block text-warn-400">Menos de 10% de respuesta: cambia la primera línea y agrega una muestra gratis.</span>}
            {sem.cotizaciones >= 3 && sem.cierres === 0 && <span className="mt-1 block text-warn-400">Cotizas pero no cierras: revisa precio, paquetes y guiones de objeciones.</span>}
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <SectionTitle>Últimos 14 días</SectionTitle>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ left: -20, right: 4, top: 4 }}>
                <CartesianGrid stroke="#22262d" vertical={false} />
                <XAxis dataKey="dia" stroke="#6f7783" fontSize={10} tickLine={false} axisLine={false} interval={1} />
                <YAxis stroke="#6f7783" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#121418', border: '1px solid #2e333c', borderRadius: 12, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="Mensajes" fill="#d4af37" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cierres" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
