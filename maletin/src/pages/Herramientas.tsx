import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, MessageCircle, Pause, Play, Plus, Printer, Save, Square, Timer, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { Aviso, Badge, Card, Field, PageHeader, Segmented, SectionTitle, Stat } from '../components/ui'
import { Copiar } from '../components/Copiar'
import { LogoLKMR } from '../components/LogoLKMR'
import { PrintPortal } from '../components/PrintPortal'
import { OFERTAS_EXPRESS } from '../data/efectivo'
import { CATEGORIAS_GUION, GUIONES } from '../data/guiones'
import { LOGROS, logrosDesbloqueados } from '../data/logros'
import { ritualDe } from '../components/Ritual'
import { useNow } from '../lib/useNow'
import type { Cotizacion } from '../types'
import { cn, dinero, duracionTexto, fechaCorta, hoyISO, incrustada, lunesDe, sumarDias, uid } from '../lib/utils'
import { confirmar } from '../components/Confirmar'

type Tab = 'cotizador' | 'precios' | 'guiones' | 'logros' | 'enfoque'

export function Herramientas({ tabInicial }: { tabInicial?: string }) {
  const [tab, setTab] = useState<Tab>((['cotizador', 'precios', 'guiones', 'logros', 'enfoque'].includes(tabInicial ?? '') ? tabInicial : 'cotizador') as Tab)
  return (
    <div>
      <PageHeader kicker="Caja de herramientas" title="Herramientas" sub="Cotiza con profesionalismo, cobra lo justo, responde con guiones probados y trabaja enfocado." />
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-5"
        options={[
          { id: 'cotizador', label: 'Cotizador' },
          { id: 'precios', label: 'Calculadora de precios' },
          { id: 'guiones', label: 'Guiones' },
          { id: 'logros', label: 'Logros' },
          { id: 'enfoque', label: 'Modo enfoque' },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {tab === 'cotizador' && <Cotizador />}
          {tab === 'precios' && <Precios />}
          {tab === 'guiones' && <Guiones />}
          {tab === 'logros' && <Logros />}
          {tab === 'enfoque' && <Enfoque />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ───────── Cotizador ───────── */
const IVA = 0.16

export const totalesCot = (c: Cotizacion) => {
  const subtotal = c.conceptos.reduce((a, x) => a + x.cant * x.precio, 0)
  const iva = c.iva ? subtotal * IVA : 0
  const total = subtotal + iva
  return { subtotal, iva, total, anticipo: total * (c.anticipoPct / 100) }
}

const nuevaCot = (n: number): Cotizacion => ({
  id: '',
  folio: `LKM-${new Date().getFullYear()}-${String(n + 1).padStart(3, '0')}`,
  fecha: hoyISO(),
  cliente: '',
  negocio: '',
  contacto: '',
  conceptos: [{ id: uid(), desc: '', cant: 1, precio: 0 }],
  anticipoPct: 50,
  vigencia: 15,
  entrega: '5 días hábiles después del anticipo',
  notas: 'Incluye 2 rondas de cambios. Dominio, cuentas y accesos quedan a nombre del cliente.',
  iva: false,
  estado: 'borrador',
})

const resumenTexto = (c: Cotizacion) => {
  const t = totalesCot(c)
  return [
    `*Cotización ${c.folio}* · LKM'r Company`,
    `Para: ${c.cliente}${c.negocio ? ` (${c.negocio})` : ''}`,
    '',
    ...c.conceptos.filter((x) => x.desc).map((x) => `• ${x.desc}${x.cant > 1 ? ` ×${x.cant}` : ''}: ${dinero(x.cant * x.precio)}`),
    '',
    c.iva ? `Subtotal ${dinero(t.subtotal)} + IVA ${dinero(t.iva)}` : '',
    `*Total: ${dinero(t.total)} MXN*`,
    `Anticipo para iniciar (${c.anticipoPct}%): ${dinero(t.anticipo)}`,
    `Entrega: ${c.entrega}`,
    `Vigencia: ${c.vigencia} días`,
    c.notas ? `\n${c.notas}` : '',
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n')
}

const telDe = (s: string) => {
  const d = s.replace(/\D/g, '')
  if (d.length === 10) return `52${d}`
  if (d.length >= 12) return d
  return ''
}

function Cotizador() {
  const { estado, actualizar, marcarActivo } = useStore()
  const [c, setC] = useState<Cotizacion>(() => nuevaCot(estado.cotizaciones.length))
  const set = <K extends keyof Cotizacion>(k: K, v: Cotizacion[K]) => setC((x) => ({ ...x, [k]: v }))

  const guardar = () => {
    const fin = { ...c, id: c.id || uid() }
    actualizar((s) => ({ ...s, cotizaciones: c.id ? s.cotizaciones.map((x) => (x.id === c.id ? fin : x)) : [fin, ...s.cotizaciones] }))
    setC(fin)
    marcarActivo()
  }
  const agregarOferta = (id: string) => {
    const o = OFERTAS_EXPRESS.find((x) => x.id === id)
    if (!o) return
    setC((x) => ({ ...x, conceptos: [...x.conceptos.filter((y) => y.desc || y.precio), { id: uid(), desc: o.nombre, cant: 1, precio: o.precioBase }] }))
  }
  const wa = `https://wa.me/${telDe(c.contacto)}?text=${encodeURIComponent(resumenTexto(c))}`
  const valida = c.cliente.trim() && c.conceptos.some((x) => x.desc && x.precio > 0)

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Datos</SectionTitle>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setC(nuevaCot(estado.cotizaciones.length))}><Plus className="h-3.5 w-3.5" /> Nueva</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cliente *"><input className="input" value={c.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Dra. Martínez" /></Field>
            <Field label="Negocio"><input className="input" value={c.negocio} onChange={(e) => set('negocio', e.target.value)} placeholder="Consultorio dental" /></Field>
            <Field label="WhatsApp o correo" hint="Si pones 10 dígitos, el botón de WhatsApp abre su chat."><input className="input" value={c.contacto} onChange={(e) => set('contacto', e.target.value)} /></Field>
            <Field label="Folio y fecha">
              <div className="flex gap-2"><input className="input font-mono text-sm" value={c.folio} onChange={(e) => set('folio', e.target.value)} /><input className="input" type="date" value={c.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
            </Field>
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>Conceptos</SectionTitle>
            <select className="input w-auto py-1.5 text-xs" value="" onChange={(e) => agregarOferta(e.target.value)} aria-label="Agregar oferta express">
              <option value="">+ Desde oferta express…</option>
              {OFERTAS_EXPRESS.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {c.conceptos.map((x) => (
              <div key={x.id} className="flex flex-wrap items-center gap-2">
                <input className="input min-w-0 flex-1 basis-full py-2 text-sm sm:basis-auto" placeholder="Descripción" value={x.desc} onChange={(e) => set('conceptos', c.conceptos.map((y) => (y.id === x.id ? { ...y, desc: e.target.value } : y)))} />
                <input className="input w-16 py-2 text-center font-mono text-sm" type="number" min="1" value={x.cant} onChange={(e) => set('conceptos', c.conceptos.map((y) => (y.id === x.id ? { ...y, cant: Math.max(1, Number(e.target.value) || 1) } : y)))} aria-label="Cantidad" />
                <input className="input w-28 py-2 font-mono text-sm" type="number" min="0" placeholder="$" value={x.precio || ''} onChange={(e) => set('conceptos', c.conceptos.map((y) => (y.id === x.id ? { ...y, precio: Number(e.target.value) || 0 } : y)))} aria-label="Precio unitario" />
                <button className="text-ink-500 hover:text-alert-400" aria-label="Quitar" onClick={() => set('conceptos', c.conceptos.filter((y) => y.id !== x.id))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button className="mt-2 text-xs text-gold-400 hover:underline" onClick={() => set('conceptos', [...c.conceptos, { id: uid(), desc: '', cant: 1, precio: 0 }])}>+ Concepto</button>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Anticipo %"><input className="input font-mono" type="number" min="0" max="100" value={c.anticipoPct} onChange={(e) => set('anticipoPct', Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /></Field>
            <Field label="Vigencia (días)"><input className="input font-mono" type="number" min="1" value={c.vigencia} onChange={(e) => set('vigencia', Number(e.target.value) || 1)} /></Field>
            <Field label="IVA">
              <label className="flex h-[46px] items-center gap-2 text-sm text-ink-300"><input type="checkbox" checked={c.iva} onChange={(e) => set('iva', e.target.checked)} className="accent-[#d4af37]" /> Agregar 16%</label>
            </Field>
          </div>
          <div className="mt-3 grid gap-3">
            <Field label="Entrega"><input className="input" value={c.entrega} onChange={(e) => set('entrega', e.target.value)} /></Field>
            <Field label="Condiciones / notas"><textarea className="input min-h-16" value={c.notas} onChange={(e) => set('notas', e.target.value)} /></Field>
            <Field label="Estado">
              <select className="input" value={c.estado} onChange={(e) => set('estado', e.target.value as Cotizacion['estado'])}>
                <option value="borrador">Borrador</option><option value="enviada">Enviada</option><option value="aceptada">Aceptada</option><option value="rechazada">Rechazada</option>
              </select>
            </Field>
          </div>
          {c.iva && <p className="mt-2 text-xs text-ink-500">Cobra IVA solo si estás inscrito en el RFC con un régimen que lo requiera. Verifica con un contador.</p>}
        </Card>
      </div>

      <div className="space-y-4">
        <div className="xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-2xl border border-ink-700 bg-white text-[#111] shadow-xl">
            <DocCotizacion c={c} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-gold" onClick={guardar} disabled={!valida}><Save className="h-4 w-4" /> Guardar</button>
            <button className="btn-ghost" onClick={() => { guardar(); setTimeout(() => window.print(), 50) }} disabled={!valida}><Printer className="h-4 w-4" /> PDF / Imprimir</button>
            <a className={cn('btn-ghost', !valida && 'pointer-events-none opacity-40')} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            <Copiar texto={resumenTexto(c)} label="Copiar resumen" className="py-2.5 text-sm" />
          </div>
          <p className="mt-2 text-xs text-ink-500">"PDF / Imprimir" abre el diálogo del navegador: elige "Guardar como PDF".</p>
          {incrustada && <p className="mt-2 text-xs text-warn-400">Aquí la impresión está bloqueada. Abre la app en su propia pestaña o en tu sitio publicado para guardar el PDF.</p>}
        </div>
        {estado.cotizaciones.length > 0 && (
          <Card>
            <SectionTitle>Cotizaciones guardadas</SectionTitle>
            <ul className="divide-y divide-ink-700/60">
              {estado.cotizaciones.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <button className="min-w-0 text-left" onClick={() => setC(x)}>
                    <span className="font-mono text-xs text-ink-400">{x.folio}</span> <span className="truncate">{x.cliente}</span>
                  </button>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono">{dinero(totalesCot(x).total)}</span>
                    <Badge tone={x.estado === 'aceptada' ? 'money' : x.estado === 'rechazada' ? 'alert' : x.estado === 'enviada' ? 'gold' : 'neutral'}>{x.estado}</Badge>
                    <button aria-label="Eliminar" className="text-ink-500 hover:text-alert-400" onClick={() => void confirmar('¿Eliminar cotización?').then((ok) => ok && actualizar((s) => ({ ...s, cotizaciones: s.cotizaciones.filter((y) => y.id !== x.id) })))}><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <PrintPortal><DocCotizacion c={c} /></PrintPortal>
    </div>
  )
}

export function DocCotizacion({ c }: { c: Cotizacion }) {
  const t = totalesCot(c)
  const vence = sumarDias(c.fecha, c.vigencia)
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#111', background: '#fff' }} className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#111] pb-4">
        <div>
          <LogoLKMR className="h-8 w-auto" tinta="#0a0b0d" acento="#5f8f00" />
          <p className="mt-2 text-[11px] text-[#555]">Estudio digital · Jesús María, Aguascalientes</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#555]">Cotización</p>
          <p className="font-mono text-sm font-semibold">{c.folio}</p>
          <p className="text-[11px] text-[#555]">{fechaCorta(c.fecha)} · vigente hasta {fechaCorta(vence)}</p>
        </div>
      </div>
      <div className="mt-4 text-sm">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#777]">Para</p>
        <p className="font-semibold">{c.cliente || 'Nombre del cliente'}</p>
        {c.negocio && <p className="text-[#444]">{c.negocio}</p>}
      </div>
      <table className="mt-5 w-full text-sm">
        <thead>
          <tr className="border-b border-[#ddd] text-left text-[11px] uppercase tracking-wider text-[#777]">
            <th className="py-2 font-medium">Concepto</th>
            <th className="py-2 text-center font-medium">Cant.</th>
            <th className="py-2 pl-3 text-right font-medium">Precio</th>
            <th className="py-2 pl-3 text-right font-medium">Importe</th>
          </tr>
        </thead>
        <tbody>
          {c.conceptos.filter((x) => x.desc || x.precio).map((x) => (
            <tr key={x.id} className="border-b border-[#eee]">
              <td className="py-2 pr-2">{x.desc}</td>
              <td className="py-2 text-center">{x.cant}</td>
              <td className="py-2 pl-3 text-right font-mono">{dinero(x.precio)}</td>
              <td className="py-2 pl-3 text-right font-mono">{dinero(x.cant * x.precio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-full max-w-[260px] space-y-1 text-sm">
        {c.iva && <div className="flex justify-between"><span className="text-[#555]">Subtotal</span><span className="font-mono">{dinero(t.subtotal)}</span></div>}
        {c.iva && <div className="flex justify-between"><span className="text-[#555]">IVA 16%</span><span className="font-mono">{dinero(t.iva)}</span></div>}
        <div className="flex justify-between border-t-2 border-[#111] pt-2 text-base font-bold"><span>Total MXN</span><span className="font-mono">{dinero(t.total)}</span></div>
        <div className="flex justify-between rounded bg-[#f1f7e0] px-2 py-1 text-[13px]"><span>Anticipo {c.anticipoPct}%</span><span className="font-mono font-semibold">{dinero(t.anticipo)}</span></div>
      </div>
      <div className="mt-6 grid gap-3 text-[13px] sm:grid-cols-2">
        <div><p className="text-[11px] uppercase tracking-[0.15em] text-[#777]">Entrega</p><p>{c.entrega}</p></div>
        <div><p className="text-[11px] uppercase tracking-[0.15em] text-[#777]">Forma de pago</p><p>{c.anticipoPct}% para iniciar, resto al aprobar. Transferencia o efectivo.</p></div>
      </div>
      {c.notas && <p className="mt-4 whitespace-pre-wrap text-[12px] text-[#444]">{c.notas}</p>}
      <p className="mt-6 border-t border-[#eee] pt-3 text-center text-[11px] text-[#888]">LKM'r Company · Gracias por la confianza</p>
    </div>
  )
}

/* ───────── Calculadora de precios ───────── */
function Num({ label, v, set, hint, suf }: { label: string; v: number; set: (n: number) => void; hint?: string; suf?: string }) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <input className="input pr-12 font-mono" type="number" min="0" value={v || ''} onChange={(e) => set(Number(e.target.value) || 0)} />
        {suf && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">{suf}</span>}
      </div>
    </Field>
  )
}

function Precios() {
  const [meta, setMeta] = useState(8000)
  const [horasSem, setHorasSem] = useState(12)
  const [gastos, setGastos] = useState(500)
  const [imp, setImp] = useState(10)
  const [horas, setHoras] = useState(8)
  const [costos, setCostos] = useState(0)
  const [margen, setMargen] = useState(30)
  const [colchon, setColchon] = useState(20)
  const [valorCliente, setValorCliente] = useState(800)
  const [clientesMes, setClientesMes] = useState(3)
  const [meses, setMeses] = useState(12)
  const [captura, setCaptura] = useState(10)

  const r = useMemo(() => {
    const horasMes = Math.max(1, horasSem * 4.33)
    const tarifaMin = (meta + gastos) / horasMes / Math.max(0.01, 1 - imp / 100)
    const minimo = horas * tarifaMin + costos
    const proyecto = (horas * (1 + colchon / 100) * tarifaMin + costos) * (1 + margen / 100)
    const valorTotal = valorCliente * clientesMes * meses
    const porValor = valorTotal * (captura / 100)
    return { horasMes, tarifaMin, minimo, proyecto, valorTotal, porValor }
  }, [meta, horasSem, gastos, imp, horas, costos, margen, colchon, valorCliente, clientesMes, meses, captura])

  const recomendado = Math.max(r.proyecto, Math.min(r.porValor, r.proyecto * 2.5))
  const redondeo = (n: number) => Math.ceil(n / 50) * 50

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <SectionTitle>1 · Por hora</SectionTitle>
          <div className="space-y-3">
            <Num label="¿Cuánto quieres ganar al mes?" v={meta} set={setMeta} suf="MXN" />
            <Num label="Horas facturables por semana" v={horasSem} set={setHorasSem} suf="h" hint="Solo las horas que cobras, no las de prospección." />
            <Num label="Gastos del negocio al mes" v={gastos} set={setGastos} suf="MXN" hint="Internet, herramientas, transporte." />
            <Num label="% aproximado para impuestos" v={imp} set={setImp} suf="%" hint="Estimación; confirma con un contador." />
          </div>
          <div className="mt-4 rounded-xl bg-gold-500/10 p-3">
            <div className="label text-gold-400">Tu tarifa mínima por hora</div>
            <div className="font-display text-2xl font-semibold text-gold-300">{dinero(r.tarifaMin)}</div>
          </div>
        </Card>
        <Card>
          <SectionTitle>2 · Por proyecto</SectionTitle>
          <div className="space-y-3">
            <Num label="Horas estimadas del proyecto" v={horas} set={setHoras} suf="h" />
            <Num label="Costos directos (dominio, impresión, etc.)" v={costos} set={setCostos} suf="MXN" />
            <Num label="Colchón por imprevistos" v={colchon} set={setColchon} suf="%" hint="Los proyectos casi siempre toman más de lo estimado." />
            <Num label="Margen de ganancia" v={margen} set={setMargen} suf="%" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-alert-500/10 p-3"><div className="label text-alert-400">Mínimo</div><div className="font-mono text-lg">{dinero(redondeo(r.minimo))}</div></div>
            <div className="rounded-xl bg-money-500/10 p-3"><div className="label text-money-400">Precio proyecto</div><div className="font-mono text-lg">{dinero(redondeo(r.proyecto))}</div></div>
          </div>
        </Card>
        <Card>
          <SectionTitle>3 · Por valor</SectionTitle>
          <div className="space-y-3">
            <Num label="¿Cuánto le deja al cliente un cliente nuevo?" v={valorCliente} set={setValorCliente} suf="MXN" hint="Pregúntaselo: ticket promedio × veces que compra." />
            <Num label="Clientes extra al mes (estimación conservadora)" v={clientesMes} set={setClientesMes} />
            <Num label="Meses de beneficio" v={meses} set={setMeses} suf="meses" />
            <Num label="% del valor que capturas" v={captura} set={setCaptura} suf="%" hint="Normal: 5–20%." />
          </div>
          <div className="mt-4 rounded-xl bg-sky-500/10 p-3">
            <div className="label text-sky-300">Precio por valor</div>
            <div className="font-mono text-lg">{dinero(redondeo(r.porValor))}</div>
            <div className="text-xs text-ink-400">de {dinero(r.valorTotal)} que podría generarle</div>
          </div>
        </Card>
      </div>
      <Card gold>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Cifra mínima para que valga la pena" value={dinero(redondeo(r.minimo))} sub="Debajo de esto, pierdes dinero o tiempo" />
          <Stat label="Precio recomendado" value={dinero(redondeo(recomendado))} tone="gold" sub="Entre el precio por proyecto y el de valor" />
          <Stat label="Tu hora real a ese precio" value={dinero(redondeo(recomendado) / Math.max(1, horas))} tone="money" sub={`con ${horas} h de trabajo`} />
        </div>
      </Card>
      <Aviso>Los cálculos son una guía para no cobrar de menos. El valor para el cliente es una estimación: no prometas esos resultados, úsalos solo para justificar tu precio. Impuestos: confirma con un contador.</Aviso>
    </div>
  )
}

/* ───────── Guiones ───────── */
function Guiones() {
  const [cat, setCat] = useState<keyof typeof CATEGORIAS_GUION | 'todos'>('todos')
  const lista = GUIONES.filter((g) => cat === 'todos' || g.categoria === cat)
  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <button onClick={() => setCat('todos')} className={cn('chip shrink-0 px-3 py-1.5 text-sm', cat === 'todos' ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-700 text-ink-300')}>Todos</button>
        {(Object.keys(CATEGORIAS_GUION) as (keyof typeof CATEGORIAS_GUION)[]).map((k) => (
          <button key={k} onClick={() => setCat(k)} className={cn('chip shrink-0 px-3 py-1.5 text-sm', cat === k ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-700 text-ink-300')}>{CATEGORIAS_GUION[k]}</button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {lista.map((g) => (
          <Card key={g.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="label text-gold-400">{CATEGORIAS_GUION[g.categoria]}</span>
                <h3 className="font-semibold">{g.titulo}</h3>
                <p className="text-xs text-ink-400">{g.cuando}</p>
              </div>
              <Copiar texto={g.texto} />
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-ink-950/70 p-3 text-sm leading-relaxed text-ink-200">{g.texto}</p>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-500">Cambia lo que está entre [corchetes]. Un guion es una base: suena a ti, no a robot.</p>
    </div>
  )
}

/* ───────── Logros ───────── */
function Logros() {
  const { estado, actualizar } = useStore()
  const des = new Set(logrosDesbloqueados(estado))
  return (
    <div>
      <p className="mb-4 text-sm text-ink-300"><span className="font-semibold text-gold-300">{des.size}/{LOGROS.length}</span> logros. Se desbloquean solos con tus datos reales; los que la app no puede verificar los marcas tú, con honestidad.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {LOGROS.map((l) => {
          const on = des.has(l.id)
          return (
            <motion.div key={l.id} layout className={cn(on ? 'card-gold' : 'card', 'flex flex-col items-center p-4 text-center', !on && 'opacity-60')}>
              <span className={cn('text-4xl', !on && 'grayscale')}>{l.icono}</span>
              <p className="mt-2 text-sm font-semibold">{l.nombre}</p>
              <p className="mt-1 text-xs text-ink-400">{l.desc}</p>
              {!l.check && (
                <button
                  className="mt-3 text-xs text-gold-400 hover:underline"
                  onClick={() => actualizar((s) => ({ ...s, logrosManuales: on ? s.logrosManuales.filter((x) => x !== l.id) : [...s.logrosManuales, l.id] }))}
                >
                  {on ? 'Desmarcar' : 'Ya lo logré'}
                </button>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── Modo enfoque (Pomodoro) ───────── */
function Enfoque() {
  const { estado, actualizar } = useStore()
  const now = useNow(500)
  const f = estado.focoActivo
  const hoy = hoyISO()
  const sugeridas = [
    ...(estado.tareas[hoy] ?? []).filter((x) => !x.hecho).map((x) => x.texto),
    ...ritualDe(estado.rituales).dinero.filter((x) => x.t && !x.h).map((x) => x.t),
  ]
  const [tarea, setTarea] = useState(sugeridas[0] ?? '')
  const [min, setMin] = useState(25)

  const iniciar = (minutos: number, tipo: 'foco' | 'descanso') =>
    actualizar((s) => ({ ...s, focoActivo: { fin: Date.now() + minutos * 60000, minutos, tarea: tipo === 'foco' ? tarea || 'Trabajo profundo' : 'Descanso', tipo } }))
  const pausar = () => f && actualizar((s) => ({ ...s, focoActivo: s.focoActivo && { ...s.focoActivo, pausadoRestante: Math.max(0, s.focoActivo.fin - Date.now()) } }))
  const reanudar = () => f && actualizar((s) => ({ ...s, focoActivo: s.focoActivo && { ...s.focoActivo, fin: Date.now() + (s.focoActivo.pausadoRestante ?? 0), pausadoRestante: undefined } }))
  const detener = () => actualizar((s) => ({ ...s, focoActivo: null }))

  const restante = f ? (f.pausadoRestante ?? Math.max(0, f.fin - now)) : min * 60000
  const total = f ? f.minutos * 60000 : min * 60000
  const pct = 1 - restante / total
  const R = 88
  const C = 2 * Math.PI * R

  const lunes = lunesDe()
  const semana = estado.sesionesFoco.filter((s) => s.fecha >= lunes)
  const hoyS = estado.sesionesFoco.filter((s) => s.fecha === hoy)

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card gold className="flex flex-col items-center lg:col-span-3">
        <div className="relative my-2 h-56 w-56">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle cx="100" cy="100" r={R} fill="none" stroke="#22262d" strokeWidth="10" />
            <circle cx="100" cy="100" r={R} fill="none" stroke={f?.tipo === 'descanso' ? '#34d399' : '#d4af37'} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset .5s linear' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-4xl font-semibold tabular-nums">{duracionTexto(restante).replace(/^0:/, '')}</span>
            <span className="mt-1 text-xs text-ink-400">{f ? (f.tipo === 'foco' ? 'Enfoque' : 'Descanso') : 'Listo'}</span>
          </div>
        </div>
        {f ? (
          <div className="w-full text-center">
            <p className="mb-4 text-sm text-ink-200">{f.tarea}</p>
            <div className="flex justify-center gap-2">
              {f.pausadoRestante ? <button className="btn-gold" onClick={reanudar}><Play className="h-4 w-4" /> Reanudar</button> : <button className="btn-ghost" onClick={pausar}><Pause className="h-4 w-4" /> Pausar</button>}
              <button className="btn-ghost" onClick={detener}><Square className="h-4 w-4" /> Detener</button>
            </div>
            <p className="mt-3 text-xs text-ink-500">El temporizador sigue aunque cambies de sección o recargues. Celular en modo no molestar.</p>
          </div>
        ) : (
          <div className="w-full space-y-3">
            <Field label="¿En qué vas a trabajar?">
              <input className="input" list="tareas-foco" value={tarea} onChange={(e) => setTarea(e.target.value)} placeholder="Una sola tarea" />
              <datalist id="tareas-foco">{sugeridas.map((s) => <option key={s} value={s} />)}</datalist>
            </Field>
            <div className="flex justify-center gap-2">
              {[25, 50, 90].map((m) => <button key={m} onClick={() => setMin(m)} className={cn('chip px-4 py-2 text-sm', min === m ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-600 text-ink-300')}>{m} min</button>)}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn-gold" onClick={() => iniciar(min, 'foco')}><Timer className="h-4 w-4" /> Iniciar enfoque</button>
              <button className="btn-ghost" onClick={() => iniciar(5, 'descanso')}>Descanso 5 min</button>
              <button className="btn-ghost" onClick={() => iniciar(15, 'descanso')}>Descanso 15 min</button>
            </div>
          </div>
        )}
      </Card>
      <div className="space-y-5 lg:col-span-2">
        <div className="grid grid-cols-2 gap-3">
          <Card><Stat label="Hoy" value={`${hoyS.length}`} sub={`${hoyS.reduce((a, s) => a + s.minutos, 0)} min`} tone="gold" /></Card>
          <Card><Stat label="Esta semana" value={`${semana.length}`} sub={`${Math.round(semana.reduce((a, s) => a + s.minutos, 0) / 6) / 10} h de enfoque`} tone="money" /></Card>
        </div>
        <Card>
          <SectionTitle><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-gold-500" /> Sesiones recientes</span></SectionTitle>
          {estado.sesionesFoco.length === 0 ? <p className="text-sm text-ink-400">Completa tu primera sesión de 25 minutos.</p> : (
            <ul className="space-y-1.5 text-sm">
              {[...estado.sesionesFoco].reverse().slice(0, 8).map((s) => (
                <li key={s.id} className="flex justify-between gap-2"><span className="truncate text-ink-300">{s.tarea}</span><span className="shrink-0 font-mono text-xs text-ink-500">{fechaCorta(s.fecha)} · {s.minutos}m</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
