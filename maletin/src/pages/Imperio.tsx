import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, ChevronDown, Crown, FlaskConical, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { Aviso, Badge, Card, CheckRow, Field, PageHeader, Progress, Segmented, SectionTitle, Sheet, Stat } from '../components/ui'
import { ACTIVOS, EVOLUCION_LKMR, FORMATOS_PRODUCTO, VALIDACION_PRODUCTO } from '../data/imperio'
import { apartadoTotal, invertidoEn, saldoFondo, splitSugerido } from '../lib/acciones'
import { nivelDe } from '../lib/selectores'
import type { EstadoProducto, ProductoLab } from '../types'
import { cn, dinero, dineroCorto, fechaCorta, hoyISO, uid } from '../lib/utils'
import { confirmar } from '../components/Confirmar'

type Tab = 'arbol' | 'lkmr' | 'lab' | 'simulador' | 'fondo'

export function Imperio({ tabInicial }: { tabInicial?: string }) {
  const [tab, setTab] = useState<Tab>((['arbol', 'lkmr', 'lab', 'simulador', 'fondo'].includes(tabInicial ?? '') ? tabInicial : 'arbol') as Tab)
  return (
    <div>
      <PageHeader kicker="Vía Larga" title="Modo Imperio" sub="Activos que siguen generando sin cambiar horas por pesos: marca, audiencia, productos, software, agencia e inversiones. Se financian con la Vía Rápida." />
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-5"
        options={[
          { id: 'arbol', label: 'Árbol de activos' },
          { id: 'lkmr', label: "Evolución LKM'r" },
          { id: 'lab', label: 'Laboratorio' },
          { id: 'simulador', label: 'Simulador' },
          { id: 'fondo', label: 'Fondo Vía Larga' },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {tab === 'arbol' && <Arbol />}
          {tab === 'lkmr' && <Evolucion />}
          {tab === 'lab' && <Laboratorio />}
          {tab === 'simulador' && <Simulador />}
          {tab === 'fondo' && <Fondo />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ───────── Árbol de activos ───────── */
function Arbol() {
  const { estado, actualizar, marcarActivo } = useStore()
  const [abierto, setAbierto] = useState<string | null>(null)
  const [asignar, setAsignar] = useState<string | null>(null)
  const [monto, setMonto] = useState('')
  const saldo = saldoFondo(estado)
  const totalHitos = ACTIVOS.reduce((a, x) => a + x.hitos.length, 0)
  const hechos = ACTIVOS.reduce((a, x) => a + x.hitos.filter((_, i) => estado.checks[`activo:${x.id}:${i}`]).length, 0)

  return (
    <div>
      <div className="flex flex-col items-center">
        <div className="card-gold flex items-center gap-3 px-5 py-3">
          <Crown className="h-5 w-5 text-gold-400" />
          <div>
            <div className="font-display font-semibold">Imperio LKM'r</div>
            <div className="text-xs text-ink-400">{hechos}/{totalHitos} hitos · fondo disponible {dinero(saldo)}</div>
          </div>
        </div>
        <div className="h-6 w-px bg-gold-500/50" />
        <div className="hidden h-px w-[83%] bg-gold-500/40 lg:block" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ACTIVOS.map((a) => {
          const h = a.hitos.filter((_, i) => estado.checks[`activo:${a.id}:${i}`]).length
          const open = abierto === a.id
          const inv = invertidoEn(estado, a.id)
          return (
            <div key={a.id} className="relative">
              <div className="mx-auto hidden h-5 w-px lg:block" style={{ background: `${a.color}80` }} />
              <div className="card overflow-hidden" style={{ borderTop: `2px solid ${a.color}` }}>
                <button onClick={() => setAbierto(open ? null : a.id)} className="w-full p-4 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{a.nombre}</h3>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-400 transition', open && 'rotate-180')} />
                  </div>
                  <p className="mt-1 text-sm text-ink-400">{a.que}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={h} max={a.hitos.length} />
                    <span className="shrink-0 font-mono text-xs text-ink-300">{h}/{a.hitos.length}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <Badge>{a.tiempo}</Badge>
                    {inv > 0 && <Badge tone="money">Invertido {dinero(inv)}</Badge>}
                  </div>
                </button>
                {open && (
                  <div className="space-y-3 border-t border-ink-700/70 p-4 text-sm">
                    <div><div className="label mb-1">Cómo lo alimenta la Vía Rápida</div><p className="text-ink-200">{a.alimenta}</p></div>
                    <div><div className="label mb-1">Qué genera</div><p className="text-money-300">{a.genera}</p></div>
                    <div>
                      <div className="label mb-1">Hitos</div>
                      <div className="-mx-2">
                        {a.hitos.map((t, i) => {
                          const k = `activo:${a.id}:${i}`
                          return <CheckRow key={k} checked={!!estado.checks[k]} onToggle={() => { const v = !estado.checks[k]; actualizar((s) => ({ ...s, checks: { ...s.checks, [k]: v } })); if (v) marcarActivo() }}>{t}</CheckRow>
                        })}
                      </div>
                    </div>
                    <button className="btn-ghost w-full text-xs" onClick={() => { setAsignar(a.id); setMonto('') }} disabled={saldo <= 0}>
                      <ArrowDownRight className="h-3.5 w-3.5" /> Invertir del fondo ({dinero(saldo)} disponibles)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <Sheet open={!!asignar} onClose={() => setAsignar(null)} title={`Invertir en ${ACTIVOS.find((x) => x.id === asignar)?.nombre ?? ''}`}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const n = Math.min(Number(monto), saldo)
            if (!(n > 0) || !asignar) return
            actualizar((s) => ({ ...s, fondoLargo: [...s.fondoLargo, { id: uid(), fecha: hoyISO(), monto: -n, concepto: `Inversión en ${ACTIVOS.find((x) => x.id === asignar)?.nombre}`, activo: asignar }] }))
            setAsignar(null)
          }}
        >
          <Field label="Monto (MXN)" hint={`Disponible: ${dinero(saldo)}. Solo compras que aumenten el activo (equipo, herramientas, promoción, colaboradores).`}>
            <input className="input font-mono text-lg" type="number" min="0" max={saldo} autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} />
          </Field>
          <button className="btn-gold w-full" disabled={!(Number(monto) > 0)}>Registrar inversión</button>
        </form>
      </Sheet>
    </div>
  )
}

/* ───────── Evolución LKM'r ───────── */
function Evolucion() {
  const { estado, actualizar, marcarActivo } = useStore()
  const [abierta, setAbierta] = useState(EVOLUCION_LKMR[0].id)
  return (
    <div className="relative space-y-3 pl-8 sm:pl-10">
      <div className="absolute bottom-4 left-[13px] top-4 w-px bg-gradient-to-b from-gold-500/70 to-ink-700 sm:left-[17px]" />
      {EVOLUCION_LKMR.map((e, idx) => {
        const h = e.hacer.filter((_, i) => estado.checks[`lkmr:${e.id}:${i}`]).length
        const completa = h === e.hacer.length
        const open = abierta === e.id
        return (
          <div key={e.id} className="relative">
            <div className={cn('absolute -left-8 top-4 grid h-7 w-7 place-items-center rounded-full border text-xs font-bold sm:-left-10 sm:h-9 sm:w-9', completa ? 'border-money-500 bg-money-500 text-ink-950' : 'border-gold-500 bg-ink-900 text-gold-400')}>{idx + 1}</div>
            <div className={cn(open ? 'card-gold' : 'card', 'overflow-hidden')}>
              <button onClick={() => setAbierta(open ? '' : e.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                <div>
                  <p className="font-semibold">{e.nombre}</p>
                  <p className="text-sm text-ink-400">{e.equipo} · <span className="font-mono text-money-400">{e.rango}</span></p>
                </div>
                <span className="font-mono text-xs text-ink-400">{h}/{e.hacer.length}</span>
              </button>
              {open && (
                <div className="grid gap-4 border-t border-ink-700/70 p-4 text-sm md:grid-cols-3">
                  <div>
                    <div className="label mb-1">Qué hacer</div>
                    <div className="-mx-2">
                      {e.hacer.map((t, i) => {
                        const k = `lkmr:${e.id}:${i}`
                        return <CheckRow key={k} checked={!!estado.checks[k]} onToggle={() => { const v = !estado.checks[k]; actualizar((s) => ({ ...s, checks: { ...s.checks, [k]: v } })); if (v) marcarActivo() }}>{t}</CheckRow>
                      })}
                    </div>
                  </div>
                  <div><div className="label mb-1">Qué aprender</div><ul className="space-y-1 text-ink-200">{e.aprender.map((x) => <li key={x}>· {x}</li>)}</ul></div>
                  <div><div className="label mb-1">Qué delegar</div><ul className="space-y-1 text-ink-200">{e.delegar.map((x) => <li key={x}>· {x}</li>)}</ul></div>
                  <div className="md:col-span-3 rounded-xl bg-money-500/10 p-3 text-money-300"><span className="font-semibold">Señal para pasar a la siguiente etapa:</span> {e.senal}</div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ───────── Laboratorio de productos ───────── */
const ESTADOS_P: { id: EstadoProducto; label: string; tone: 'neutral' | 'gold' | 'blue' | 'money' | 'alert' }[] = [
  { id: 'idea', label: 'Idea', tone: 'neutral' },
  { id: 'validando', label: 'Validando', tone: 'gold' },
  { id: 'construyendo', label: 'Construyendo', tone: 'blue' },
  { id: 'lanzado', label: 'Lanzado', tone: 'money' },
  { id: 'descartado', label: 'Descartado', tone: 'alert' },
]

function Laboratorio() {
  const { estado, actualizar } = useStore()
  const [edit, setEdit] = useState<ProductoLab | null>(null)

  // Servicios que más se repiten en el CRM: candidatos naturales a producto.
  const candidatos = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of estado.leads) if (['cerrado', 'recurrente'].includes(l.estado) && l.servicio) c[l.servicio] = (c[l.servicio] || 0) + 1
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [estado.leads])

  const nuevo = (servicio = ''): ProductoLab => ({ id: '', nombre: '', servicioOrigen: servicio, problema: '', formato: FORMATOS_PRODUCTO[0], precio: 0, validacion: {}, estado: 'idea', notas: '' })
  const guardar = (p: ProductoLab) => {
    const fin = { ...p, id: p.id || uid() }
    actualizar((s) => ({ ...s, productos: p.id ? s.productos.map((x) => (x.id === p.id ? fin : x)) : [fin, ...s.productos] }))
    setEdit(null)
  }

  return (
    <div className="space-y-5">
      <Card gold>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <SectionTitle><span className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-gold-400" /> Convierte servicios repetidos en productos</span></SectionTitle>
            <p className="text-sm text-ink-300">Regla: no construyes nada hasta pasar la validación. Lo que vendiste muchas veces a mano es la mejor pista de qué producto hacer.</p>
          </div>
          <button className="btn-gold" onClick={() => setEdit(nuevo())}><Plus className="h-4 w-4" /> Nuevo experimento</button>
        </div>
        {candidatos.length > 0 && (
          <div className="mt-4">
            <div className="label mb-2">Candidatos desde tu CRM</div>
            <div className="flex flex-wrap gap-2">
              {candidatos.map(([s, n]) => <button key={s} onClick={() => setEdit(nuevo(s))} className="chip border-gold-600/50 bg-gold-500/10 text-gold-200">{s} · vendido {n}×</button>)}
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {estado.productos.map((p) => {
          const v = VALIDACION_PRODUCTO.filter((x) => p.validacion[x.id]).length
          const e = ESTADOS_P.find((x) => x.id === p.estado)!
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{p.nombre || 'Sin nombre'}</p>
                  <p className="text-sm text-ink-400">{p.formato}{p.precio ? ` · ${dinero(p.precio)}` : ''}</p>
                </div>
                <Badge tone={e.tone}>{e.label}</Badge>
              </div>
              {p.problema && <p className="mt-2 text-sm text-ink-300">{p.problema}</p>}
              <div className="mt-3 flex items-center gap-3"><Progress value={v} max={VALIDACION_PRODUCTO.length} color={v >= 6 ? 'money' : 'gold'} /><span className="shrink-0 font-mono text-xs">{v}/{VALIDACION_PRODUCTO.length}</span></div>
              <p className="mt-2 text-xs text-ink-400">{v >= 6 ? 'Validación suficiente: puedes construir la versión mínima.' : v >= 3 ? 'Sigue validando: busca pre-ventas reales.' : 'Aún no construyas. Habla con clientes primero.'}</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-ghost flex-1 py-2 text-xs" onClick={() => setEdit(p)}>Abrir</button>
                <button className="btn-ghost px-3 py-2" aria-label="Eliminar" onClick={() => void confirmar('¿Eliminar experimento?').then((ok) => ok && actualizar((s) => ({ ...s, productos: s.productos.filter((x) => x.id !== p.id) })))}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </Card>
          )
        })}
      </div>
      {estado.productos.length === 0 && <p className="text-center text-sm text-ink-400">Sin experimentos todavía.</p>}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Experimento de producto" wide>
        {edit && <FormProducto inicial={edit} onGuardar={guardar} />}
      </Sheet>
    </div>
  )
}

function FormProducto({ inicial, onGuardar }: { inicial: ProductoLab; onGuardar: (p: ProductoLab) => void }) {
  const [p, setP] = useState(inicial)
  const set = <K extends keyof ProductoLab>(k: K, v: ProductoLab[K]) => setP((x) => ({ ...x, [k]: v }))
  const v = VALIDACION_PRODUCTO.filter((x) => p.validacion[x.id]).length
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onGuardar(p) }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre del producto"><input className="input" value={p.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej. Kit de menú digital para fondas" autoFocus /></Field>
        <Field label="Servicio de origen"><input className="input" value={p.servicioOrigen} onChange={(e) => set('servicioOrigen', e.target.value)} /></Field>
        <Field label="Formato">
          <select className="input" value={p.formato} onChange={(e) => set('formato', e.target.value)}>{FORMATOS_PRODUCTO.map((f) => <option key={f}>{f}</option>)}</select>
        </Field>
        <Field label="Precio objetivo (MXN)"><input className="input font-mono" type="number" min="0" value={p.precio || ''} onChange={(e) => set('precio', Number(e.target.value) || 0)} /></Field>
      </div>
      <Field label="Problema en una frase"><input className="input" value={p.problema} onChange={(e) => set('problema', e.target.value)} placeholder="Ej. Las fondas no pueden pagar $1,500 por un menú, pero sí $299 por hacerlo solas" /></Field>
      <div>
        <div className="mb-1 flex items-center justify-between"><span className="text-xs font-medium text-ink-300">Plantilla de validación</span><span className="font-mono text-xs text-gold-300">{v}/{VALIDACION_PRODUCTO.length}</span></div>
        <div className="-mx-2">
          {VALIDACION_PRODUCTO.map((x) => <CheckRow key={x.id} checked={!!p.validacion[x.id]} onToggle={() => set('validacion', { ...p.validacion, [x.id]: !p.validacion[x.id] })}>{x.texto}</CheckRow>)}
        </div>
      </div>
      <Field label="Estado">
        <select className="input" value={p.estado} onChange={(e) => set('estado', e.target.value as EstadoProducto)}>{ESTADOS_P.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
      </Field>
      {p.estado === 'construyendo' && v < 6 && <Aviso>Estás construyendo con menos de 6/8 validaciones. Riesgo alto de invertir tiempo en algo que nadie compre.</Aviso>}
      <Field label="Notas"><textarea className="input min-h-20" value={p.notas} onChange={(e) => set('notas', e.target.value)} /></Field>
      <button className="btn-gold w-full">Guardar</button>
    </form>
  )
}

/* ───────── Simulador de futuro ───────── */
function Simulador() {
  const [ingreso, setIngreso] = useState(5000)
  const [crec, setCrec] = useState(30)
  const [ahorro, setAhorro] = useState(15)
  const [reinv, setReinv] = useState(20)
  const [rend, setRend] = useState(8)

  const datos = useMemo(() => {
    const out: { anio: number; Patrimonio: number; Aportado: number; Reinvertido: number; ingresoMes: number; acumulado: number }[] = []
    let pat = 0, aport = 0, reinvAc = 0, acum = 0
    out.push({ anio: 0, Patrimonio: 0, Aportado: 0, Reinvertido: 0, ingresoMes: ingreso, acumulado: 0 })
    for (let m = 1; m <= 120; m++) {
      const ing = ingreso * Math.pow(1 + crec / 100, (m - 1) / 12)
      pat = pat * (1 + rend / 100 / 12) + ing * (ahorro / 100)
      aport += ing * (ahorro / 100)
      reinvAc += ing * (reinv / 100)
      acum += ing
      if (m % 12 === 0) out.push({ anio: m / 12, Patrimonio: Math.round(pat), Aportado: Math.round(aport), Reinvertido: Math.round(reinvAc), ingresoMes: Math.round(ing), acumulado: Math.round(acum) })
    }
    return out
  }, [ingreso, crec, ahorro, reinv, rend])

  const hitos = [1, 3, 5, 10].map((a) => datos[a])
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="space-y-4 lg:col-span-2">
          <SectionTitle>Supuestos</SectionTitle>
          <R label="Ingreso mensual hoy" v={ingreso} set={setIngreso} min={0} max={100000} step={500} fmt={dinero} />
          <R label="Crecimiento anual del ingreso" v={crec} set={setCrec} min={0} max={100} step={5} fmt={(n) => `${n}%`} />
          <R label="% que ahorras e inviertes" v={ahorro} set={setAhorro} min={0} max={60} step={1} fmt={(n) => `${n}%`} />
          <R label="% que reinviertes en activos" v={reinv} set={setReinv} min={0} max={60} step={1} fmt={(n) => `${n}%`} />
          <R label="Rendimiento anual estimado de la inversión" v={rend} set={setRend} min={0} max={15} step={0.5} fmt={(n) => `${n}%`} />
        </Card>
        <Card className="lg:col-span-3">
          <SectionTitle>Proyección a 10 años</SectionTitle>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datos} margin={{ left: -4, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4af37" stopOpacity={0.5} /><stop offset="100%" stopColor="#d4af37" stopOpacity={0} /></linearGradient>
                  <linearGradient id="sr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} /><stop offset="100%" stopColor="#60a5fa" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#22262d" vertical={false} />
                <XAxis dataKey="anio" stroke="#6f7783" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}a`} />
                <YAxis stroke="#6f7783" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => dineroCorto(Number(v))} />
                <Tooltip contentStyle={{ background: '#121418', border: '1px solid #2e333c', borderRadius: 12, fontSize: 12 }} labelFormatter={(l) => `Año ${l}`} formatter={(v) => dinero(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Patrimonio" name="Patrimonio invertido" stroke="#d4af37" fill="url(#sp)" strokeWidth={2} />
                <Area type="monotone" dataKey="Aportado" name="Lo que aportaste" stroke="#34d399" fill="none" strokeWidth={2} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="Reinvertido" name="Reinvertido en activos" stroke="#60a5fa" fill="url(#sr)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {hitos.map((h) => (
          <Card key={h.anio}>
            <div className="label mb-2">En {h.anio} {h.anio === 1 ? 'año' : 'años'}</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2"><span className="text-ink-400">Ingreso/mes</span><span className="font-mono">{dineroCorto(h.ingresoMes)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-ink-400">Patrimonio</span><span className="font-mono text-gold-300">{dineroCorto(h.Patrimonio)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-ink-400">En activos</span><span className="font-mono text-sky-300">{dineroCorto(h.Reinvertido)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-ink-400">Ingresos acum.</span><span className="font-mono text-money-400">{dineroCorto(h.acumulado)}</span></div>
            </div>
          </Card>
        ))}
      </div>
      <Aviso>Escenario hipotético con supuestos fijos: no es una predicción ni una promesa. Los ingresos reales suben y bajan, las tasas cambian, hay impuestos e inflación. El valor de lo reinvertido en activos depende de cómo lo ejecutes. Úsalo para entender el efecto del tiempo y la constancia.</Aviso>
    </div>
  )
}

function R({ label, v, set, min, max, step, fmt }: { label: string; v: number; set: (n: number) => void; min: number; max: number; step: number; fmt: (n: number) => string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="text-ink-300">{label}</span><span className="font-mono text-gold-300">{fmt(v)}</span></div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} className="w-full accent-[#d4af37]" aria-label={label} />
    </div>
  )
}

/* ───────── Fondo Vía Larga ───────── */
function Fondo() {
  const { estado, actualizar } = useStore()
  const { n } = nivelDe(estado)
  const saldo = saldoFondo(estado)
  const sug = splitSugerido(n)
  const [manual, setManual] = useState<null | 'mas' | 'menos'>(null)
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [activo, setActivo] = useState(ACTIVOS[0].id)
  const setCfg = (k: 'pctReinversion' | 'pctTiempoRapida', v: number) => actualizar((s) => ({ ...s, config: { ...s.config, [k]: v } }))
  const lista = [...estado.fondoLargo].sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Card><Stat label="Disponible" value={dineroCorto(saldo)} tone="gold" /></Card>
        <Card><Stat label="Apartado total" value={dineroCorto(apartadoTotal(estado))} tone="money" /></Card>
        <Card><Stat label="Invertido" value={dineroCorto(apartadoTotal(estado) - saldo)} /></Card>
      </div>
      <Card gold>
        <SectionTitle>Regla de oro: la Vía Rápida financia la Vía Larga</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-1 flex justify-between text-sm"><span className="text-ink-300">% de cada ingreso rápido que se aparta</span><span className="font-mono text-gold-300">{estado.config.pctReinversion}%</span></div>
            <input type="range" min={0} max={50} step={5} value={estado.config.pctReinversion} onChange={(e) => setCfg('pctReinversion', Number(e.target.value))} className="w-full accent-[#d4af37]" />
            <p className="mt-1 text-xs text-ink-400">Se registra solo al guardar un ingreso de Vía Rápida. Recomendado: 10–25% al inicio.</p>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm"><span className="text-ink-300">Tiempo Vía Rápida / Vía Larga</span><span className="font-mono text-gold-300">{estado.config.pctTiempoRapida}/{100 - estado.config.pctTiempoRapida}</span></div>
            <input type="range" min={20} max={100} step={5} value={estado.config.pctTiempoRapida} onChange={(e) => setCfg('pctTiempoRapida', Number(e.target.value))} className="w-full accent-[#d4af37]" />
            <p className="mt-1 text-xs text-ink-400">Sugerido para Nivel {n}: {sug}/{100 - sug}. Al inicio 80/20, migrando hacia 30/70 conforme crecen tus activos.
              {estado.config.pctTiempoRapida !== sug && <button className="ml-1 text-gold-400 underline" onClick={() => setCfg('pctTiempoRapida', sug)}>Aplicar</button>}
            </p>
          </div>
        </div>
      </Card>
      <Card>
        <SectionTitle right={<div className="flex gap-2"><button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setManual('mas')}><ArrowUpRight className="h-3.5 w-3.5" /> Aportar</button><button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setManual('menos')} disabled={saldo <= 0}><ArrowDownRight className="h-3.5 w-3.5" /> Invertir</button></div>}>Movimientos del fondo</SectionTitle>
        {lista.length === 0 ? <p className="text-sm text-ink-400">Registra un ingreso de Vía Rápida en Finanzas o en la Sala de guerra y verás el apartado aquí.</p> : (
          <ul className="divide-y divide-ink-700/60">
            {lista.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{a.concepto}</span>
                  <span className="text-xs text-ink-500">{fechaCorta(a.fecha)}{a.origen ? ' · automático' : ''}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className={cn('font-mono', a.monto >= 0 ? 'text-money-400' : 'text-sky-300')}>{a.monto >= 0 ? '+' : '−'}{dinero(Math.abs(a.monto))}</span>
                  {!a.origen && <button aria-label="Eliminar" className="text-ink-500 hover:text-alert-400" onClick={() => actualizar((s) => ({ ...s, fondoLargo: s.fondoLargo.filter((x) => x.id !== a.id) }))}><Trash2 className="h-3.5 w-3.5" /></button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Sheet open={!!manual} onClose={() => setManual(null)} title={manual === 'mas' ? 'Aporte manual al fondo' : 'Invertir del fondo'}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            let v = Number(monto)
            if (!(v > 0)) return
            if (manual === 'menos') v = -Math.min(v, saldo)
            actualizar((s) => ({ ...s, fondoLargo: [...s.fondoLargo, { id: uid(), fecha: hoyISO(), monto: v, concepto: concepto.trim() || (v > 0 ? 'Aporte manual' : `Inversión en ${ACTIVOS.find((x) => x.id === activo)?.nombre}`), activo: v < 0 ? activo : undefined }] }))
            setManual(null); setMonto(''); setConcepto('')
          }}
        >
          <Field label="Monto (MXN)"><input className="input font-mono" type="number" min="0" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} /></Field>
          <Field label="Concepto"><input className="input" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder={manual === 'mas' ? 'Ej. Ahorro extra del mes' : 'Ej. Micrófono para el canal'} /></Field>
          {manual === 'menos' && (
            <Field label="Activo"><select className="input" value={activo} onChange={(e) => setActivo(e.target.value)}>{ACTIVOS.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></Field>
          )}
          <button className="btn-gold w-full" disabled={!(Number(monto) > 0)}>Guardar</button>
        </form>
      </Sheet>
    </div>
  )
}
