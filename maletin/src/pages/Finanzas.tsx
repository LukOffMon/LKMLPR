import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { Aviso, Badge, Card, Empty, Field, PageHeader, Progress, Segmented, SectionTitle, Sheet, Stat } from '../components/ui'
import { AVISO_FISCAL, AVISO_INVERSION, EDU_FINANZAS, FORMALIZACION } from '../data/finanzasEdu'
import { resumenMes } from '../lib/selectores'
import { dinero, dineroCorto, fechaCorta, hoyISO, mesClave, nombreMes, uid } from '../lib/utils'
import type { Movimiento, Via } from '../types'
import { conMovimiento, sinMovimiento } from '../lib/acciones'
import { confirmar } from '../components/Confirmar'

type Tab = 'registro' | 'metas' | 'aprende' | 'formal'

const CAT_ING = ['Servicio', 'Venta', 'Comisión', 'Mensualidad', 'Otro']
const CAT_GAS = ['Herramientas', 'Inventario', 'Transporte', 'Publicidad', 'Cursos', 'Personal', 'Otro']
const COLORES = ['#d4af37', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#f59e0b', '#fb7185']

const tooltipStyle = {
  contentStyle: { background: '#121418', border: '1px solid #2e333c', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#c5cad1' },
  itemStyle: { color: '#e7e9ec' },
}

export function Finanzas() {
  const [tab, setTab] = useState<Tab>('registro')
  return (
    <div>
      <PageHeader kicker="Sección 5" title="Centro financiero" sub="Registra cada peso el mismo día. Lo que no se mide, se pierde." />
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-5 w-full sm:w-auto"
        options={[
          { id: 'registro', label: 'Registro' },
          { id: 'metas', label: 'Metas de ahorro' },
          { id: 'aprende', label: 'Aprende' },
          { id: 'formal', label: 'Formalización' },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {tab === 'registro' && <Registro />}
          {tab === 'metas' && <Metas />}
          {tab === 'aprende' && <Aprende />}
          {tab === 'formal' && <Formal />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Registro() {
  const { estado, actualizar, marcarActivo } = useStore()
  const [abrir, setAbrir] = useState<null | 'ingreso' | 'gasto'>(null)
  const [mesSel, setMesSel] = useState(mesClave(hoyISO()))
  const mes = resumenMes(estado, mesSel)

  const meses = useMemo(() => {
    const set = new Set(estado.movimientos.map((m) => mesClave(m.fecha)))
    set.add(mesClave(hoyISO()))
    return [...set].sort().reverse()
  }, [estado.movimientos])

  const serie = useMemo(() => {
    const out: { mes: string; Ingresos: number; Gastos: number }[] = []
    const d = new Date()
    for (let i = 5; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const k = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
      const r = resumenMes(estado, k)
      out.push({ mes: nombreMes(k), Ingresos: r.ingresos, Gastos: r.gastos })
    }
    return out
  }, [estado])

  const delMes = estado.movimientos.filter((m) => mesClave(m.fecha) === mesSel).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const porCat = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const m of delMes) if (m.tipo === 'ingreso') acc[m.categoria] = (acc[m.categoria] || 0) + m.monto
    return Object.entries(acc).map(([name, value]) => ({ name, value }))
  }, [delMes])

  const reparto = [
    { k: 'Reinversión', p: 0.4 },
    { k: 'Fondo de emergencia', p: 0.3 },
    { k: 'Ahorro largo plazo', p: 0.15 },
    { k: 'Libre', p: 0.15 },
  ]

  const guardar = (m: Omit<Movimiento, 'id'>) => {
    actualizar((s) => conMovimiento(s, m))
    marcarActivo()
    setAbrir(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setAbrir('ingreso')} className="btn-money"><ArrowUpRight className="h-4 w-4" /> Ingreso</button>
        <button onClick={() => setAbrir('gasto')} className="btn-ghost"><ArrowDownRight className="h-4 w-4" /> Gasto</button>
        <select className="input ml-auto w-auto py-2" value={mesSel} onChange={(e) => setMesSel(e.target.value)} aria-label="Mes">
          {meses.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><Stat label="Ingresos" value={dineroCorto(mes.ingresos)} tone="money" /></Card>
        <Card><Stat label="Gastos" value={dineroCorto(mes.gastos)} /></Card>
        <Card><Stat label="Neto" value={dineroCorto(mes.neto)} tone={mes.neto >= 0 ? 'gold' : undefined} /></Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionTitle>Últimos 6 meses</SectionTitle>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ left: -12, right: 4, top: 4 }}>
                <CartesianGrid stroke="#22262d" vertical={false} />
                <XAxis dataKey="mes" stroke="#6f7783" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6f7783" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => dineroCorto(Number(v))} />
                <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => dinero(Number(v))} />
                <Bar dataKey="Ingresos" fill="#34d399" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Gastos" fill="#4a515c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle>Ingresos por tipo</SectionTitle>
          {porCat.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2} stroke="none">
                    {porCat.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v) => dinero(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#9aa1ab' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-ink-400">Sin ingresos este mes.</p>
          )}
        </Card>
      </div>

      {mes.ingresos > 0 && (
        <Card gold>
          <SectionTitle right={<a href="#/protocolo/dinero" className="text-xs text-gold-400 hover:underline">Protocolo de dinero</a>}>Reparto sugerido de este mes</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {reparto.map((r) => (
              <div key={r.k} className="rounded-xl bg-ink-900/70 p-3">
                <div className="text-xs text-ink-400">{r.k} · {r.p * 100}%</div>
                <div className="mt-1 font-mono font-semibold text-gold-300">{dinero(mes.ingresos * r.p)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>Movimientos de {nombreMes(mesSel)}</SectionTitle>
        {delMes.length === 0 ? (
          <Empty icon={<PiggyBank className="h-8 w-8" />} title="Sin movimientos">Registra tu primer ingreso aunque sea de $50.</Empty>
        ) : (
          <ul className="divide-y divide-ink-700/60">
            {delMes.map((m) => (
              <li key={m.id} className="group flex items-center gap-3 py-2.5">
                <span className={m.tipo === 'ingreso' ? 'grid h-8 w-8 place-items-center rounded-lg bg-money-500/15 text-money-400' : 'grid h-8 w-8 place-items-center rounded-lg bg-ink-700 text-ink-300'}>
                  {m.tipo === 'ingreso' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.concepto}</p>
                  <p className="text-xs text-ink-400">{fechaCorta(m.fecha)} · {m.categoria}{m.tipo === 'ingreso' && <span className={m.via === 'larga' ? 'text-sky-300' : 'text-gold-400'}> · {m.via === 'larga' ? 'Vía Larga' : 'Vía Rápida'}</span>}</p>
                </div>
                <span className={m.tipo === 'ingreso' ? 'font-mono text-sm text-money-400' : 'font-mono text-sm text-ink-300'}>
                  {m.tipo === 'ingreso' ? '+' : '−'}{dinero(m.monto)}
                </span>
                <button onClick={() => void confirmar('¿Eliminar movimiento?').then((ok) => ok && actualizar((s) => sinMovimiento(s, m.id)))} className="p-1.5 text-ink-500 opacity-60 hover:text-alert-400 group-hover:opacity-100" aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Sheet open={!!abrir} onClose={() => setAbrir(null)} title={abrir === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto'}>
        {abrir && <FormMov tipo={abrir} onGuardar={guardar} />}
      </Sheet>
    </div>
  )
}

function FormMov({ tipo, onGuardar }: { tipo: 'ingreso' | 'gasto'; onGuardar: (m: Omit<Movimiento, 'id'>) => void }) {
  const cats = tipo === 'ingreso' ? CAT_ING : CAT_GAS
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [categoria, setCategoria] = useState(cats[0])
  const [fecha, setFecha] = useState(hoyISO())
  const [via, setVia] = useState<Via>('rapida')
  const { estado } = useStore()
  const n = Number(monto)
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!(n > 0) || !concepto.trim()) return
        onGuardar({ tipo, monto: n, concepto: concepto.trim(), categoria, fecha, via: tipo === 'ingreso' ? via : undefined })
      }}
    >
      <Field label="Monto (MXN)">
        <input className="input font-mono text-lg" inputMode="decimal" type="number" min="0" step="any" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Concepto">
        <input className="input" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder={tipo === 'ingreso' ? 'Ej. Landing page Dental Sonrisa' : 'Ej. Pasta térmica'} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría">
          <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Fecha">
          <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
      </div>
      {tipo === 'ingreso' && (
        <Field label="¿De qué vía viene?" hint={via === 'rapida' ? `Se apartará automáticamente ${estado.config.pctReinversion}% (${dinero(n > 0 ? n * estado.config.pctReinversion / 100 : 0)}) al fondo de Vía Larga.` : 'Ingreso de un activo (producto, audiencia, inversión). No se aparta porcentaje.'}>
          <Segmented value={via} onChange={setVia} options={[{ id: 'rapida', label: 'Vía Rápida (servicios)' }, { id: 'larga', label: 'Vía Larga (activos)' }]} />
        </Field>
      )}
      <button className={tipo === 'ingreso' ? 'btn-money w-full' : 'btn-gold w-full'} disabled={!(n > 0) || !concepto.trim()}>
        Guardar
      </button>
    </form>
  )
}

function Metas() {
  const { estado, actualizar } = useStore()
  const [nueva, setNueva] = useState(false)
  const [abono, setAbono] = useState<string | null>(null)
  const [monto, setMonto] = useState('')
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('')

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <p className="text-sm text-ink-300">Primero el fondo de emergencia. Después, metas que aumenten tu capacidad de ganar (herramientas, equipo) o inversión.</p>
        <button onClick={() => setNueva(true)} className="btn-gold shrink-0"><Plus className="h-4 w-4" /> Meta</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {estado.metas.map((m) => {
          const pct = m.objetivo ? Math.min(100, (m.actual / m.objetivo) * 100) : 0
          return (
            <Card key={m.id} gold={pct >= 100}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{m.nombre}</p>
                  <p className="mt-0.5 font-mono text-sm text-ink-300">{dinero(m.actual)} <span className="text-ink-500">/ {dinero(m.objetivo)}</span></p>
                </div>
                {pct >= 100 ? <Badge tone="money">Completada</Badge> : <span className="font-mono text-sm text-gold-300">{Math.round(pct)}%</span>}
              </div>
              <Progress className="mt-3" value={m.actual} max={m.objetivo} color={pct >= 100 ? 'money' : 'gold'} />
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setAbono(m.id); setMonto('') }} className="btn-ghost flex-1 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Abonar / retirar</button>
                <button onClick={() => void confirmar('¿Eliminar meta?').then((ok) => ok && actualizar((s) => ({ ...s, metas: s.metas.filter((x) => x.id !== m.id) })))} className="btn-ghost px-3 py-2" aria-label="Eliminar meta"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </Card>
          )
        })}
      </div>
      {estado.metas.length === 0 && <Empty icon={<PiggyBank className="h-8 w-8" />} title="Sin metas">Crea tu fondo de emergencia de $5,000.</Empty>}

      <Sheet open={nueva} onClose={() => setNueva(false)} title="Nueva meta de ahorro">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const o = Number(objetivo)
            if (!nombre.trim() || !(o > 0)) return
            actualizar((s) => ({ ...s, metas: [...s.metas, { id: uid(), nombre: nombre.trim(), objetivo: o, actual: 0, creada: hoyISO() }] }))
            setNombre('')
            setObjetivo('')
            setNueva(false)
          }}
        >
          <Field label="Nombre"><input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Laptop para edición" autoFocus /></Field>
          <Field label="Objetivo (MXN)"><input className="input font-mono" type="number" min="0" inputMode="decimal" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} /></Field>
          <button className="btn-gold w-full">Crear meta</button>
        </form>
      </Sheet>

      <Sheet open={!!abono} onClose={() => setAbono(null)} title="Mover dinero de la meta">
        <div className="space-y-4">
          <Field label="Monto (MXN)" hint="Usa Abonar para sumar y Retirar para restar.">
            <input className="input font-mono text-lg" type="number" min="0" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {[1, -1].map((signo) => (
              <button
                key={signo}
                className={signo > 0 ? 'btn-money' : 'btn-ghost'}
                disabled={!(Number(monto) > 0)}
                onClick={() => {
                  const v = Number(monto) * signo
                  actualizar((s) => ({ ...s, metas: s.metas.map((x) => (x.id === abono ? { ...x, actual: Math.max(0, x.actual + v) } : x)) }))
                  setAbono(null)
                }}
              >
                {signo > 0 ? 'Abonar' : 'Retirar'}
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    </div>
  )
}

function Aprende() {
  const [inicial, setInicial] = useState(1000)
  const [mensual, setMensual] = useState(500)
  const [tasa, setTasa] = useState(9)
  const [anios, setAnios] = useState(10)

  const datos = useMemo(() => {
    const out: { anio: string; Aportado: number; Total: number }[] = []
    const r = tasa / 100 / 12
    let total = inicial
    let aportado = inicial
    out.push({ anio: '0', Aportado: aportado, Total: total })
    for (let m = 1; m <= anios * 12; m++) {
      total = total * (1 + r) + mensual
      aportado += mensual
      if (m % 12 === 0) out.push({ anio: String(m / 12), Aportado: Math.round(aportado), Total: Math.round(total) })
    }
    return out
  }, [inicial, mensual, tasa, anios])
  const fin = datos[datos.length - 1]

  return (
    <div className="space-y-5">
      <Card gold>
        <SectionTitle>Calculadora de interés compuesto</SectionTitle>
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <Rango label="Monto inicial" valor={inicial} set={setInicial} min={0} max={50000} step={500} fmt={dinero} />
            <Rango label="Aportación mensual" valor={mensual} set={setMensual} min={0} max={10000} step={100} fmt={dinero} />
            <Rango label="Tasa anual estimada" valor={tasa} set={setTasa} min={0} max={15} step={0.5} fmt={(v) => `${v}%`} />
            <Rango label="Años" valor={anios} set={setAnios} min={1} max={40} step={1} fmt={(v) => `${v} años`} />
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-ink-900/80 p-3 text-center">
              <div><div className="text-[11px] text-ink-400">Aportaste</div><div className="font-mono text-sm">{dineroCorto(fin.Aportado)}</div></div>
              <div><div className="text-[11px] text-ink-400">Intereses</div><div className="font-mono text-sm text-money-400">{dineroCorto(fin.Total - fin.Aportado)}</div></div>
              <div><div className="text-[11px] text-ink-400">Total</div><div className="font-mono text-sm text-gold-300">{dineroCorto(fin.Total)}</div></div>
            </div>
          </div>
          <div className="h-64 lg:col-span-3 lg:h-auto">
            <ResponsiveContainer width="100%" height="100%" minHeight={240}>
              <AreaChart data={datos} margin={{ left: -8, right: 4, top: 8 }}>
                <defs>
                  <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4af37" stopOpacity={0.5} /><stop offset="100%" stopColor="#d4af37" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.35} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#22262d" vertical={false} />
                <XAxis dataKey="anio" stroke="#6f7783" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6f7783" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => dineroCorto(Number(v))} />
                <Tooltip {...tooltipStyle} labelFormatter={(l) => `Año ${l}`} formatter={(v) => dinero(Number(v))} />
                <Area type="monotone" dataKey="Total" stroke="#d4af37" fill="url(#gT)" strokeWidth={2} />
                <Area type="monotone" dataKey="Aportado" stroke="#34d399" fill="url(#gA)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-500">Simulación con tasa fija y capitalización mensual, sin impuestos ni inflación. Las tasas reales cambian. Es para entender el concepto, no una proyección.</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {EDU_FINANZAS.map((e) => (
          <Card key={e.id}>
            <h3 className="mb-2 font-semibold">{e.titulo}</h3>
            <div className="space-y-2 text-sm leading-relaxed text-ink-300">
              {e.texto.map((t) => <p key={t}>{t}</p>)}
            </div>
          </Card>
        ))}
      </div>
      <Aviso>{AVISO_INVERSION}</Aviso>
    </div>
  )
}

function Rango({ label, valor, set, min, max, step, fmt }: { label: string; valor: number; set: (n: number) => void; min: number; max: number; step: number; fmt: (n: number) => string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="text-ink-300">{label}</span><span className="font-mono text-gold-300">{fmt(valor)}</span></div>
      <input type="range" min={min} max={max} step={step} value={valor} onChange={(e) => set(Number(e.target.value))} className="w-full accent-[#d4af37]" />
    </div>
  )
}

function Formal() {
  return (
    <div className="space-y-4">
      <Aviso>{AVISO_FISCAL}</Aviso>
      <div className="grid gap-4 md:grid-cols-2">
        {FORMALIZACION.map((f) => (
          <Card key={f.titulo}>
            <h3 className="mb-3 font-semibold">{f.titulo}</h3>
            <ul className="space-y-2 text-sm text-ink-300">
              {f.puntos.map((p) => <li key={p} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />{p}</li>)}
            </ul>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="mb-2 font-semibold">Fuentes oficiales</h3>
        <ul className="space-y-1.5 text-sm">
          <li><a className="text-gold-300 hover:underline" href="https://www.sat.gob.mx/" target="_blank" rel="noreferrer">sat.gob.mx</a> <span className="text-ink-400">— RFC, regímenes, facturación, declaraciones.</span></li>
          <li><a className="text-gold-300 hover:underline" href="https://www.condusef.gob.mx/" target="_blank" rel="noreferrer">condusef.gob.mx</a> <span className="text-ink-400">— verifica instituciones financieras y alertas de fraude.</span></li>
          <li><a className="text-gold-300 hover:underline" href="https://www.cetesdirecto.com/" target="_blank" rel="noreferrer">cetesdirecto.com</a> <span className="text-ink-400">— información oficial de CETES.</span></li>
        </ul>
      </Card>
    </div>
  )
}
