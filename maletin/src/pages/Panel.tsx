import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarClock, Compass, Flame, Plus, Quote, Target, Trash2, TrendingUp } from 'lucide-react'
import { useStore } from '../store/store'
import { Badge, Card, CheckRow, Progress, SectionTitle, Stat } from '../components/ui'
import { dinero, fechaCorta, hoyISO, uid, diffDias } from '../lib/utils'
import { nivelDe, racha, resumenMes, seguimientosPendientes } from '../lib/selectores'
import { fraseDelDia } from '../data/frases'
import { ideaPorId } from '../data/ideas'
import { PROTOCOLOS } from '../data/protocolos'

export function Panel() {
  const { estado, actualizar, marcarActivo } = useStore()
  const hoy = hoyISO()
  const tareas = estado.tareas[hoy] ?? []
  const [nueva, setNueva] = useState('')
  const mes = resumenMes(estado)
  const { n, actual, siguiente } = nivelDe(estado)
  const r = racha(estado)
  const segs = seguimientosPendientes(estado).slice(0, 4)
  const ruta = estado.rutaElegida ? ideaPorId[estado.rutaElegida] : null
  const hechasHoy = estado.diasActivos.includes(hoy)

  const meta = siguiente?.umbral ?? actual?.umbral ?? 5000
  const pendientesAyer = useMemo(() => {
    const fechas = Object.keys(estado.tareas).filter((f) => f < hoy).sort()
    const ult = fechas[fechas.length - 1]
    return ult ? (estado.tareas[ult] ?? []).filter((t) => !t.hecho) : []
  }, [estado.tareas, hoy])

  const protocoloActivo = useMemo(() => {
    for (const p of PROTOCOLOS.slice(0, 3)) {
      const items = p.bloques.flatMap((b) => b.items)
      const hechos = items.filter((i) => estado.checks[`${p.id}:${i.id}`]).length
      if (hechos < items.length) return { p, hechos, total: items.length, sig: items.find((i) => !estado.checks[`${p.id}:${i.id}`]) }
    }
    return null
  }, [estado.checks])

  const setTareas = (fn: (t: typeof tareas) => typeof tareas) =>
    actualizar((s) => ({ ...s, tareas: { ...s.tareas, [hoy]: fn(s.tareas[hoy] ?? []) } }))

  const agregar = (texto: string) => {
    const t = texto.trim()
    if (!t) return
    setTareas((ts) => [...ts, { id: uid(), texto: t, hecho: false }])
    setNueva('')
  }

  const toggle = (id: string) => {
    const t = tareas.find((x) => x.id === id)
    setTareas((ts) => ts.map((x) => (x.id === id ? { ...x, hecho: !x.hecho } : x)))
    if (t && !t.hecho) marcarActivo()
  }

  const saludo = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  })()

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label mb-2">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {saludo}
            {estado.nombre ? `, ${estado.nombre}` : ''}.
          </h1>
        </div>
        <button
          onClick={marcarActivo}
          disabled={hechasHoy}
          className={hechasHoy ? 'btn border border-money-600/40 bg-money-500/10 text-money-300' : 'btn-gold'}
        >
          <Flame className="h-4 w-4" />
          {hechasHoy ? 'Hoy ya ejecutaste' : 'Marcar día ejecutado'}
        </button>
      </header>

      {!estado.diagnostico && (
        <Card gold className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Compass className="mt-0.5 h-6 w-6 shrink-0 text-gold-400" />
            <div>
              <p className="font-semibold">Empieza por el diagnóstico (5 minutos)</p>
              <p className="text-sm text-ink-300">Te recomienda las 3 mejores rutas para empezar con $0 según tus habilidades, horas y contactos.</p>
            </div>
          </div>
          <a href="#/diagnostico" className="btn-gold shrink-0">
            Hacer diagnóstico <ArrowRight className="h-4 w-4" />
          </a>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <Stat label="Ingreso del mes" value={dinero(mes.ingresos)} tone="money" sub={`Neto ${dinero(mes.neto)}`} />
        </Card>
        <Card>
          <Stat label="Meta actual" value={n === 0 ? 'Primer peso' : dinero(meta)} sub={siguiente ? `Para Nivel ${siguiente.nivel}` : 'Nivel máximo'} />
          <Progress className="mt-3" value={mes.ingresos} max={meta} color="money" />
        </Card>
        <Card>
          <Stat label="Escalera" value={`Nivel ${n}`} tone="gold" sub={actual?.nombre ?? 'Aún sin primer peso'} />
        </Card>
        <Card>
          <Stat label="Racha" value={<span className="flex items-center gap-1.5">{r}<Flame className={r ? 'h-5 w-5 text-orange-400' : 'h-5 w-5 text-ink-500'} /></span>} sub={r === 1 ? 'día ejecutando' : 'días ejecutando'} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Tareas del día */}
        <Card className="lg:col-span-3">
          <SectionTitle right={<Badge tone="gold">{tareas.filter((t) => t.hecho).length}/{tareas.length}</Badge>}>Tareas de hoy</SectionTitle>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              agregar(nueva)
            }}
            className="mb-2 flex gap-2"
          >
            <input className="input" placeholder="Ej. Mandar 10 mensajes a barberías" value={nueva} onChange={(e) => setNueva(e.target.value)} />
            <button className="btn-gold px-3" aria-label="Agregar tarea">
              <Plus className="h-5 w-5" />
            </button>
          </form>
          {tareas.length === 0 && (
            <div className="space-y-2 py-2">
              <p className="text-sm text-ink-400">Sin tareas. Sugerencias rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {['10 mensajes de prospección', 'Seguimientos del CRM', '45 min de aprendizaje', 'Registrar ingresos/gastos'].map((s) => (
                  <button key={s} onClick={() => agregar(s)} className="chip border-ink-600 bg-ink-800 text-ink-200 hover:border-gold-500/60">
                    <Plus className="h-3 w-3" /> {s}
                  </button>
                ))}
                {pendientesAyer.length > 0 && (
                  <button onClick={() => setTareas(() => pendientesAyer.map((t) => ({ ...t, id: uid() })))} className="chip border-gold-600/50 bg-gold-500/10 text-gold-300">
                    Traer {pendientesAyer.length} pendientes anteriores
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="-mx-2">
            {tareas.map((t) => (
              <div key={t.id} className="group flex items-center">
                <div className="flex-1">
                  <CheckRow checked={t.hecho} onToggle={() => toggle(t.id)}>
                    {t.texto}
                  </CheckRow>
                </div>
                <button onClick={() => setTareas((ts) => ts.filter((x) => x.id !== t.id))} className="p-2 text-ink-500 opacity-60 transition hover:text-alert-400 group-hover:opacity-100" aria-label="Eliminar tarea">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {tareas.length > 0 && tareas.every((t) => t.hecho) && (
            <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl bg-money-500/10 px-3 py-2 text-sm text-money-300">
              Día completado. Esto es exactamente lo que construye riqueza: días aburridos bien ejecutados.
            </motion.p>
          )}
        </Card>

        <div className="space-y-5 lg:col-span-2">
          {/* Frase */}
          <Card gold>
            <Quote className="mb-2 h-5 w-5 text-gold-500" />
            <p className="font-display text-lg leading-snug text-ink-100">{fraseDelDia()}</p>
          </Card>

          {/* Seguimientos */}
          <Card>
            <SectionTitle right={<a href="#/crm" className="text-xs text-gold-400 hover:underline">CRM</a>}>
              <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-gold-500" /> Próximos seguimientos</span>
            </SectionTitle>
            {segs.length === 0 ? (
              <p className="text-sm text-ink-400">Sin seguimientos agendados. Agrega prospectos en el CRM.</p>
            ) : (
              <ul className="space-y-2">
                {segs.map((l) => {
                  const d = diffDias(hoy, l.seguimiento)
                  return (
                    <li key={l.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink-900/70 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{l.nombre}{l.negocio ? ` · ${l.negocio}` : ''}</p>
                        <p className="text-xs capitalize text-ink-400">{l.estado}</p>
                      </div>
                      <Badge tone={d < 0 ? 'alert' : d === 0 ? 'gold' : 'neutral'}>{d < 0 ? `Vencido ${-d}d` : d === 0 ? 'Hoy' : fechaCorta(l.seguimiento)}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <SectionTitle><span className="flex items-center gap-2"><Target className="h-4 w-4 text-gold-500" /> Mi ruta</span></SectionTitle>
          {ruta ? (
            <div>
              <p className="font-semibold">{ruta.nombre}</p>
              <p className="mt-1 text-sm text-ink-300">{ruta.resumen}</p>
              <a href={`#/idea/${ruta.id}`} className="btn-ghost mt-3">Abrir ficha <ArrowRight className="h-4 w-4" /></a>
            </div>
          ) : (
            <div>
              <p className="text-sm text-ink-300">Aún no eliges ruta. Regla: una sola ruta por 30 días.</p>
              <a href="#/ideas" className="btn-ghost mt-3">Ver catálogo <ArrowRight className="h-4 w-4" /></a>
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle><span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-gold-500" /> Protocolo en curso</span></SectionTitle>
          {protocoloActivo ? (
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">{protocoloActivo.p.nombre}</p>
                <span className="text-xs text-ink-400">{protocoloActivo.hechos}/{protocoloActivo.total}</span>
              </div>
              <Progress className="mt-2" value={protocoloActivo.hechos} max={protocoloActivo.total} />
              {protocoloActivo.sig && <p className="mt-3 text-sm text-ink-300"><span className="text-ink-500">Siguiente: </span>{protocoloActivo.sig.texto}</p>}
              <a href={`#/protocolo/${protocoloActivo.p.id}`} className="btn-ghost mt-3">Continuar <ArrowRight className="h-4 w-4" /></a>
            </div>
          ) : (
            <p className="text-sm text-ink-300">Completaste los protocolos de arranque. Mantén prospección, entrega y dinero como hábitos.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
