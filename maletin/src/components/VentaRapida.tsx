import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/store'
import { conMovimiento } from '../lib/acciones'
import { dinero, hoyISO } from '../lib/utils'

/** Registro rápido de un ingreso de Vía Rápida (aparta automáticamente el % a Vía Larga). */
export function VentaRapida({ onHecho }: { onHecho?: () => void }) {
  const { estado, actualizar, marcarActivo } = useStore()
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const n = Number(monto)
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!(n > 0)) return
        actualizar((s) => conMovimiento(s, { tipo: 'ingreso', monto: n, concepto: concepto.trim() || 'Venta', categoria: 'Servicio', fecha: hoyISO(), via: 'rapida' }))
        marcarActivo()
        setMonto('')
        setConcepto('')
        onHecho?.()
      }}
    >
      <input className="input w-28 font-mono" type="number" min="0" inputMode="decimal" placeholder="$ monto" value={monto} onChange={(e) => setMonto(e.target.value)} aria-label="Monto" />
      <input className="input min-w-[10rem] flex-1" placeholder="Concepto (ej. Menú QR Taquería)" value={concepto} onChange={(e) => setConcepto(e.target.value)} aria-label="Concepto" />
      <button className="btn-money" disabled={!(n > 0)}>
        <Plus className="h-4 w-4" /> Registrar venta
      </button>
      {n > 0 && <p className="w-full text-xs text-ink-400">Se apartarán {dinero(n * estado.config.pctReinversion / 100)} ({estado.config.pctReinversion}%) al fondo de Vía Larga.</p>}
    </form>
  )
}
