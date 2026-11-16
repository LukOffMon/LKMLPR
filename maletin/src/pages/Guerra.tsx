import { useState } from 'react'
import { ArrowRight, Crosshair, Pencil, Rocket, Sprout, Target, Users } from 'lucide-react'
import { useStore } from '../store/store'
import { Badge, Card, PageHeader, Progress, SectionTitle, Stat } from '../components/ui'
import { RitualHoy, ritualDe } from '../components/Ritual'
import { ContadorActividad } from './Efectivo'
import { VentaRapida } from '../components/VentaRapida'
import { SPRINTS } from '../data/efectivo'
import { actividadDe, avanceSprint, finSprint, saldoFondo, splitSugerido, sprintActivo } from '../lib/acciones'
import { nivelDe, resumenMes, seguimientosPendientes } from '../lib/selectores'
import { useNow } from '../lib/useNow'
import { dinero, duracionTexto, hoyISO } from '../lib/utils'
import { PROB_ESTADO } from './CRM'
import type { EstadoApp } from '../types'

export const proximoPaso = (e: EstadoApp): { texto: string; href: string } => {
  if (!e.diagnostico) return { texto: 'Haz el diagnóstico para elegir tu ruta (5 min).', href: '#/diagnostico' }
  const venc = seguimientosPendientes(e).filter((l) => l.seguimiento <= hoyISO())
  if (venc.length) return { texto: `Da seguimiento a ${venc[0].nombre}${venc.length > 1 ? ` y ${venc.length - 1} más` : ''}: es el dinero más cercano.`, href: '#/crm' }
  const sp = sprintActivo(e)
  if (sp) {
    const def = SPRINTS[sp.tipo]
    for (const p of def.pasos) for (const i of p.items) if (!sp.checks[`${p.id}:${i.id}`]) return { texto: `Sprint · ${p.dia}: ${i.texto}.`, href: '#/efectivo' }
  }
  const r = ritualDe(e.rituales).dinero.find((d) => d.t && !d.h)
  if (r) return { texto: r.t, href: '#/plan' }
  const act = actividadDe(e)
  if (act.mensajes < 10) return { texto: `Manda ${10 - act.mensajes} mensajes de prospección más hoy.`, href: '#/efectivo/ofertas' }
  if (!sp && resumenMes(e).ingresos < e.config.metaMes) return { texto: 'Inicia un Sprint de 72 h con una oferta express.', href: '#/efectivo' }
  return { texto: 'Vía Rápida cubierta por hoy. Avanza tu tarea de Vía Larga.', href: '#/imperio' }
}

export function Guerra() {
  const { estado, actualizar } = useStore()
  const now = useNow(1000)
  const mes = resumenMes(estado)
  const meta = estado.config.metaMes
  const [editMeta, setEditMeta] = useState(false)
  const d = new Date()
  const diasMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const restantes = diasMes - d.getDate() + 1
  const falta = Math.max(0, meta - mes.ingresos)
  const sp = sprintActivo(estado)
  const paso = proximoPaso(estado)
  const { n } = nivelDe(estado)

  const abiertos = estado.leads.filter((l) => !['perdido'].includes(l.estado))
  const pipeline = abiertos.filter((l) => ['contactado', 'interesado', 'cotizado'].includes(l.estado))
  const proyectado = pipeline.reduce((a, l) => a + (l.valor || 0) * PROB_ESTADO[l.estado], 0)
  const total = pipeline.reduce((a, l) => a + (l.valor || 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader kicker="War Room" title="Sala de guerra" sub="Una sola pantalla para decidir qué hacer ahora." />

      <a href={paso.href} className="card-gold group flex items-center gap-4 p-5 transition hover:-translate-y-0.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-500 text-ink-950"><Crosshair className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <div className="label text-gold-400">Próximo paso más importante</div>
          <p className="mt-1 font-display text-lg font-semibold leading-snug">{paso.texto}</p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-gold-400 transition group-hover:translate-x-1" />
      </a>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="label flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-gold-500" /> Meta del mes</div>
              {editMeta ? (
                <input
                  autoFocus
                  className="input mt-1 w-40 font-mono"
                  type="number"
                  min="0"
                  defaultValue={meta}
                  onBlur={(e) => { actualizar((s) => ({ ...s, config: { ...s.config, metaMes: Math.max(0, Number(e.target.value) || 0) } })); setEditMeta(false) }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <button onClick={() => setEditMeta(true)} className="mt-1 flex items-center gap-2 font-display text-3xl font-semibold">{dinero(meta)} <Pencil className="h-4 w-4 text-ink-500" /></button>
              )}
            </div>
            <div className="text-right">
              <div className="label">Llevas</div>
              <div className="font-display text-3xl font-semibold text-money-400">{dinero(mes.ingresos)}</div>
            </div>
          </div>
          <Progress className="mt-4 h-3" value={mes.ingresos} max={meta} color="money" />
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <Stat label="Falta" value={dinero(falta)} />
            <Stat label="Días restantes" value={restantes} />
            <Stat label="Por día" value={dinero(falta / restantes)} tone="gold" />
          </div>
          <div className="mt-5 border-t border-ink-700/70 pt-4">
            <div className="label mb-2">Registrar venta</div>
            <VentaRapida />
          </div>
        </Card>

        <Card>
          <SectionTitle right={<a href="#/crm" className="text-xs text-gold-400 hover:underline">Kanban</a>}><span className="flex items-center gap-2"><Users className="h-4 w-4 text-gold-500" /> Pipeline</span></SectionTitle>
          <Stat label="Valor proyectado" value={dinero(proyectado)} tone="gold" sub={`de ${dinero(total)} en negociación (ponderado por etapa)`} />
          <ul className="mt-4 space-y-1.5 text-sm">
            {(['contactado', 'interesado', 'cotizado', 'cerrado', 'recurrente'] as const).map((e) => {
              const ls = estado.leads.filter((l) => l.estado === e)
              return <li key={e} className="flex justify-between"><span className="capitalize text-ink-300">{e}</span><span className="font-mono">{ls.length} · {dinero(ls.reduce((a, l) => a + (l.valor || 0), 0))}</span></li>
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle right={<a href="#/efectivo" className="text-xs text-gold-400 hover:underline">Modo Efectivo</a>}><span className="flex items-center gap-2"><Rocket className="h-4 w-4 text-gold-500" /> Sprint activo</span></SectionTitle>
          {sp ? (
            <div>
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">{SPRINTS[sp.tipo].nombre}</p>
                <span className="font-mono text-gold-300">{duracionTexto(finSprint(sp) - now)}</span>
              </div>
              <Progress className="mt-3" value={avanceSprint(estado, sp)} max={sp.meta} color="money" />
              <p className="mt-2 text-sm text-ink-300">{dinero(avanceSprint(estado, sp))} de {dinero(sp.meta)}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-ink-300">Sin sprint activo. Un sprint de 72 h es la forma más rápida de mover dinero esta semana.</p>
              <a href="#/efectivo" className="btn-gold mt-3">Iniciar sprint</a>
            </div>
          )}
          <div className="mt-5 border-t border-ink-700/70 pt-4">
            <div className="label mb-2">Actividad de hoy</div>
            <ContadorActividad compacto />
          </div>
        </Card>
        <Card>
          <RitualHoy />
        </Card>
      </div>

      <Card>
        <SectionTitle right={<a href="#/imperio" className="text-xs text-gold-400 hover:underline">Modo Imperio</a>}><span className="flex items-center gap-2"><Sprout className="h-4 w-4 text-sky-300" /> Doble vía</span></SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Fondo Vía Larga" value={dinero(saldoFondo(estado))} tone="gold" sub={`${estado.config.pctReinversion}% de cada ingreso rápido`} />
          <div>
            <div className="label">Tiempo rápida / larga</div>
            <div className="mt-1 flex h-3 overflow-hidden rounded-full">
              <div className="bg-gold-500" style={{ width: `${estado.config.pctTiempoRapida}%` }} />
              <div className="flex-1 bg-sky-400" />
            </div>
            <p className="mt-1 text-xs text-ink-400">{estado.config.pctTiempoRapida}% / {100 - estado.config.pctTiempoRapida}% · sugerido para tu nivel: {splitSugerido(n)}/{100 - splitSugerido(n)}</p>
          </div>
          <div className="flex items-center"><Badge tone="blue">La Vía Rápida financia la Vía Larga</Badge></div>
        </div>
      </Card>
    </div>
  )
}
