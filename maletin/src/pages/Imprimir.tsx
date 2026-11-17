import type { ReactNode } from 'react'
import { Printer } from 'lucide-react'
import { useStore } from '../store/store'
import { Card, PageHeader } from '../components/ui'
import { LogoLKMR } from '../components/LogoLKMR'
import { PrintPortal } from '../components/PrintPortal'
import { ritualDe } from '../components/Ritual'
import { BLOQUES, DIAS, HORAS, NIVELES, progresoDe } from './Plan'
import { SPRINTS } from '../data/efectivo'
import { ideaPorId } from '../data/ideas'
import { saldoFondo, sprintActivo } from '../lib/acciones'
import { nivelDe, resumenMes } from '../lib/selectores'
import type { EstadoApp, PlanItem } from '../types'
import { dinero, fechaCorta, hoyISO, incrustada } from '../lib/utils'

export function Imprimir() {
  const { estado } = useStore()
  return (
    <div>
      <PageHeader
        kicker="Sistema"
        title="Plan imprimible"
        sub="Tu plan maestro en una hoja: visión, metas, OKRs, semana y números clave. Imprímelo o guárdalo como PDF y pégalo donde lo veas diario."
        right={<button className="btn-gold" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / PDF</button>}
      />
      {incrustada && <p className="mb-3 text-xs text-warn-400">En esta vista el navegador bloquea la impresión. Para guardar el PDF, abre la app en su propia pestaña o en tu sitio publicado.</p>}
      <Card className="overflow-hidden p-0">
        <div className="max-h-[75vh] overflow-auto bg-white">
          <DocPlan e={estado} />
        </div>
      </Card>
      <PrintPortal><DocPlan e={estado} /></PrintPortal>
    </div>
  )
}

function H({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5f8f00', borderBottom: '1px solid #ddd', paddingBottom: 4, margin: '18px 0 8px', fontWeight: 700 }}>{children}</h2>
}

function Arbol({ e, item, nivel }: { e: EstadoApp; item: PlanItem; nivel: number }) {
  const hijos = e.plan.filter((p) => p.padreId === item.id)
  return (
    <li style={{ marginLeft: nivel ? 14 : 0, marginTop: 4, listStyle: 'none', breakInside: 'avoid' }}>
      <span style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.1em' }}>{NIVELES[item.nivel].corto} · {item.periodo}</span>
      <div style={{ fontSize: 13, fontWeight: nivel === 0 ? 700 : 500 }}>
        {item.titulo || '—'} {item.nivel !== 'vision' && <span style={{ color: '#5f8f00', fontFamily: 'monospace' }}>({progresoDe(item)}%)</span>}
      </div>
      {item.krs && item.krs.length > 0 && (
        <ul style={{ margin: '2px 0 0 12px', fontSize: 12, color: '#333' }}>
          {item.krs.map((k) => <li key={k.id}>• {k.texto || 'Resultado clave'}: {k.actual}/{k.meta}</li>)}
        </ul>
      )}
      {hijos.length > 0 && <ul style={{ borderLeft: '1px solid #ddd', paddingLeft: 6 }}>{hijos.map((h) => <Arbol key={h.id} e={e} item={h} nivel={nivel + 1} />)}</ul>}
    </li>
  )
}

export function DocPlan({ e }: { e: EstadoApp }) {
  const vision = e.plan.find((p) => p.nivel === 'vision')
  const mes = resumenMes(e)
  const { n, actual } = nivelDe(e)
  const sp = sprintActivo(e)
  const r = ritualDe(e.rituales)
  const ice = [...e.ice].sort((a, b) => b.i * b.c * b.f - a.i * a.c * a.f).slice(0, 5)
  const ruta = e.rutaElegida ? ideaPorId[e.rutaElegida] : null
  const tieneSemana = Object.keys(e.semana).length > 0
  const td = { border: '1px solid #e5e5e5', padding: '1px 3px', fontSize: 8, height: 14 } as const

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#111', background: '#fff', padding: 28, fontSize: 13, lineHeight: 1.45 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #111', paddingBottom: 10 }}>
        <div>
          <LogoLKMR className="h-7 w-auto" tinta="#0a0b0d" acento="#5f8f00" />
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>Plan maestro{e.nombre ? ` de ${e.nombre}` : ''}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#555' }}>
          Generado {fechaCorta(hoyISO())}<br />Nivel {n}{actual ? ` · ${actual.nombre}` : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
        {[
          ['Meta del mes', dinero(e.config.metaMes)],
          ['Ingreso del mes', dinero(mes.ingresos)],
          ['Fondo Vía Larga', dinero(saldoFondo(e))],
          ['Tiempo rápida/larga', `${e.config.pctTiempoRapida}/${100 - e.config.pctTiempoRapida}`],
        ].map(([k, v]) => (
          <div key={k} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '6px 8px' }}>
            <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.08em' }}>{k}</div>
            <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{v}</div>
          </div>
        ))}
      </div>

      <H>Visión y metas en cascada</H>
      {vision ? <ul style={{ padding: 0 }}><Arbol e={e} item={vision} nivel={0} /></ul> : <p style={{ color: '#777' }}>Aún sin visión escrita (Plan maestro → Horizontes).</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <H>Ritual de hoy</H>
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {[...r.dinero.map((x) => ['$', x] as const), ['L', r.larga] as const, ['A', r.aprender] as const].map(([t, x], i) => (
              <li key={i}>☐ <b style={{ color: '#5f8f00' }}>{t}</b> {x.t || '______________________'}</li>
            ))}
          </ul>
        </div>
        <div>
          <H>Ruta y sprint</H>
          <p><b>Ruta:</b> {ruta ? ruta.nombre : '—'}</p>
          <p><b>Sprint:</b> {sp ? `${SPRINTS[sp.tipo].nombre} · meta ${dinero(sp.meta)}` : 'Sin sprint activo'}</p>
          {ice.length > 0 && <><p style={{ marginTop: 6 }}><b>Prioridades (ICE):</b></p><ol style={{ margin: '2px 0 0 18px' }}>{ice.map((x) => <li key={x.id}>{x.nombre} <span style={{ color: '#777' }}>({x.i * x.c * x.f})</span></li>)}</ol></>}
        </div>
      </div>

      {tieneSemana && (
        <>
          <H>Semana modelo</H>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr><th style={td} />{DIAS.map((d) => <th key={d} style={{ ...td, fontSize: 9 }}>{d}</th>)}</tr></thead>
            <tbody>
              {HORAS.map((h) => (
                <tr key={h}>
                  <td style={{ ...td, color: '#777' }}>{h}:00</td>
                  {DIAS.map((_, d) => {
                    const t = e.semana[`${d}-${h}`]
                    return <td key={d} style={{ ...td, background: t ? `${BLOQUES[t].color}33` : undefined }}>{t ? BLOQUES[t].label : ''}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {e.metas.length > 0 && (
        <>
          <H>Metas de ahorro</H>
          <ul style={{ padding: 0, listStyle: 'none' }}>{e.metas.map((m) => <li key={m.id}>{m.nombre}: {dinero(m.actual)} / {dinero(m.objetivo)}</li>)}</ul>
        </>
      )}
      <p style={{ marginTop: 18, fontSize: 10, color: '#888', textAlign: 'center' }}>Las cifras son metas y estimaciones personales, no promesas. · Maletín · LKM'r Company</p>
    </div>
  )
}
