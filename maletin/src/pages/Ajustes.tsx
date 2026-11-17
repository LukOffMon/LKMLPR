import { useRef, useState } from 'react'
import { AlertTriangle, Download, Upload } from 'lucide-react'
import { estadoInicial, exportarJSON, leerRespaldo, normalizar, useStore } from '../store/store'
import { Copiar } from '../components/Copiar'
import { incrustada } from '../lib/utils'
import { Aviso, Card, Field, PageHeader } from '../components/ui'
import { confirmar } from '../components/Confirmar'

export function Ajustes() {
  const { estado, actualizar, reemplazar } = useStore()
  const input = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [pegado, setPegado] = useState('')

  const importarTexto = async () => {
    try {
      const json = JSON.parse(pegado)
      const datos = json && json.app === 'maletin' && json.estado ? json.estado : json
      if (!datos || typeof datos !== 'object' || !('checks' in datos || 'movimientos' in datos)) throw new Error('El texto no parece un respaldo de Maletín.')
      if (!(await confirmar('Esto reemplazará TODOS los datos actuales con los del respaldo. ¿Continuar?'))) return
      reemplazar(normalizar(datos))
      setPegado('')
      setMsg({ ok: true, t: 'Respaldo importado correctamente.' })
    } catch (err) {
      setMsg({ ok: false, t: err instanceof Error && !(err instanceof SyntaxError) ? err.message : 'El texto pegado no es un respaldo válido.' })
    }
  }

  const importar = async (f: File) => {
    try {
      const e = await leerRespaldo(f)
      if (!(await confirmar('Esto reemplazará TODOS los datos actuales con los del respaldo. ¿Continuar?'))) return
      reemplazar(e)
      setMsg({ ok: true, t: 'Respaldo importado correctamente.' })
    } catch (err) {
      setMsg({ ok: false, t: err instanceof Error ? err.message : 'No se pudo leer el archivo.' })
    }
  }

  const conteo = [
    ['Movimientos', estado.movimientos.length],
    ['Prospectos', estado.leads.length],
    ['Revisiones', estado.diario.length],
    ['Pasos de protocolos', Object.values(estado.checks).filter(Boolean).length],
    ['Días ejecutados', estado.diasActivos.length],
    ['Metas del plan', estado.plan.length],
    ['Sprints', estado.sprints.length],
    ['Cotizaciones', estado.cotizaciones.length],
    ['Sesiones de enfoque', estado.sesionesFoco.length],
  ] as const

  return (
    <div className="space-y-5">
      <PageHeader kicker="Ajustes" title="Respaldo y datos" sub="Todo se guarda en este dispositivo (localStorage). Exporta un respaldo cada semana y guárdalo en tu Drive o correo para no perder nada si cambias de celular o borras el navegador." />

      <Card>
        <Field label="¿Cómo te llamo?">
          <input className="input max-w-sm" value={estado.nombre} onChange={(e) => actualizar((s) => ({ ...s, nombre: e.target.value.slice(0, 30) }))} placeholder="Tu nombre" />
        </Field>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card gold>
          <h2 className="mb-1 font-semibold">Exportar respaldo</h2>
          <p className="mb-4 text-sm text-ink-300">Descarga un archivo JSON con todos tus datos.</p>
          <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
            {conteo.map(([k, v]) => (
              <div key={k} className="flex justify-between rounded-lg bg-ink-900/70 px-2.5 py-1.5"><span className="text-ink-400">{k}</span><span className="font-mono">{v}</span></div>
            ))}
          </div>
          <button onClick={() => exportarJSON(estado)} className="btn-gold w-full"><Download className="h-4 w-4" /> Descargar respaldo</button>
          <Copiar texto={JSON.stringify({ app: 'maletin', exportado: new Date().toISOString(), estado })} label="Copiar respaldo como texto" className="mt-2 w-full py-2.5 text-sm" />
          {incrustada && <p className="mt-2 text-xs text-warn-400">En esta vista la descarga puede estar bloqueada. Usa "Copiar respaldo como texto" y pégalo en una nota, correo o Drive.</p>}
          <a href="#/imprimir" className="btn-ghost mt-2 w-full">Ver plan imprimible</a>
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">Importar respaldo</h2>
          <p className="mb-4 text-sm text-ink-300">Restaura datos desde un archivo exportado (por ejemplo, para pasar de la PC al celular).</p>
          <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = '' }} />
          <button onClick={() => input.current?.click()} className="btn-ghost w-full"><Upload className="h-4 w-4" /> Elegir archivo</button>
          <div className="mt-4 border-t border-ink-700/70 pt-4">
            <label htmlFor="respaldo-texto" className="mb-1.5 block text-xs font-medium text-ink-300">O pega aquí un respaldo copiado como texto</label>
            <textarea id="respaldo-texto" className="input min-h-20 font-mono text-xs" value={pegado} onChange={(e) => setPegado(e.target.value)} placeholder='{"app":"maletin", ...}' />
            <button onClick={importarTexto} disabled={!pegado.trim()} className="btn-ghost mt-2 w-full">Importar texto</button>
          </div>
          {msg && <p className={msg.ok ? 'mt-3 text-sm text-money-400' : 'mt-3 text-sm text-alert-400'}>{msg.t}</p>}
        </Card>
      </div>

      <Card className="border-alert-500/30">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-alert-400"><AlertTriangle className="h-4 w-4" /> Zona de peligro</h2>
        <p className="mb-4 text-sm text-ink-300">Borra todos los datos de este dispositivo. Exporta antes un respaldo.</p>
        <button
          onClick={async () => {
            if ((await confirmar('¿Borrar TODOS los datos? No se puede deshacer.')) && (await confirmar('Última confirmación: ¿seguro?'))) reemplazar(estadoInicial())
          }}
          className="btn border border-alert-500/50 text-alert-400 hover:bg-alert-500/10"
        >
          Borrar todo
        </button>
      </Card>

      <Aviso>Maletín es una herramienta de planificación y educación. Las cifras de ingreso son estimaciones, no promesas. La información fiscal, legal y financiera es general: verifica con fuentes oficiales y profesionales.</Aviso>
    </div>
  )
}
