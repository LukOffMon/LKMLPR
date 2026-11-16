import { motion } from 'framer-motion'
import { AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Card, PageHeader } from '../components/ui'
import { TRAMPAS } from '../data/trampas'

export function Trampas() {
  return (
    <div>
      <PageHeader kicker="Sección 9" title="Trampas que debes evitar" sub="Las estafas y atajos tóxicos que más atrapan a jóvenes que quieren ser ricos. Si algo promete dinero rápido y fácil, ya sabes la respuesta." />

      <Card className="mb-5 border-alert-500/30 bg-alert-500/5">
        <div className="flex gap-3">
          <ShieldAlert className="h-6 w-6 shrink-0 text-alert-400" />
          <div className="text-sm text-ink-200">
            <p className="font-semibold text-alert-400">Prueba de 4 preguntas antes de meter dinero o tiempo en algo:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-300">
              <li>¿De dónde sale exactamente el dinero? (Si no es de un cliente que recibe valor real, desconfía.)</li>
              <li>¿Tengo que pagar para entrar o para "desbloquear" ganancias?</li>
              <li>¿Me prometen rendimientos o ingresos garantizados?</li>
              <li>¿Me presionan para decidir rápido o para reclutar a otros?</li>
            </ol>
            <p className="mt-2">Un "sí" en la 2, 3 o 4 = aléjate. Verifica entidades financieras en <a href="https://www.condusef.gob.mx/" target="_blank" rel="noreferrer" className="text-gold-300 underline">Condusef</a>.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {TRAMPAS.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="h-full">
              <div className="flex items-start gap-3">
                <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-alert-400" />
                <div className="min-w-0">
                  <h3 className="font-semibold">{t.nombre}</h3>
                  <p className="mt-1 text-sm italic text-ink-400">{t.gancho}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{t.comoFunciona}</p>
              <div className="label mb-1.5 mt-4">Señales</div>
              <ul className="space-y-1 text-sm text-ink-300">
                {t.senales.map((s) => <li key={s} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-alert-400" />{s}</li>)}
              </ul>
              <div className="mt-4 flex gap-2 rounded-xl bg-money-500/10 p-3 text-sm text-money-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span><span className="font-semibold">En su lugar:</span> {t.enSuLugar}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
